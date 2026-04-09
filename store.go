package main

import (
	"database/sql"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

var db *sql.DB

type conversation struct {
	ID        string
	Topic     string
	Model     string
	CreatedAt time.Time
	IsLive    bool
}

type message struct {
	Role    string
	Content string
}

func initDB(path string) error {
	var err error
	db, err = sql.Open("sqlite", path)
	if err != nil {
		return err
	}
	// Single writer prevents SQLITE_BUSY on concurrent requests
	db.SetMaxOpenConns(1)

	_, err = db.Exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`)
	if err != nil {
		return err
	}
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS conversations (
			id         TEXT PRIMARY KEY,
			topic      TEXT NOT NULL DEFAULT '',
			model      TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS messages (
			id              INTEGER PRIMARY KEY AUTOINCREMENT,
			conversation_id TEXT NOT NULL,
			role            TEXT NOT NULL,
			content         TEXT NOT NULL,
			FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
		);
		CREATE TABLE IF NOT EXISTS prompts (
			id         TEXT PRIMARY KEY,
			title      TEXT NOT NULL DEFAULT '',
			prompt     TEXT NOT NULL DEFAULT '',
			favorite   INTEGER NOT NULL DEFAULT 0,
			created_at INTEGER NOT NULL DEFAULT 0,
			updated_at INTEGER NOT NULL DEFAULT 0
		);
	`)
	if err != nil {
		return err
	}
	// Migration: add isLive column if not present (SQLite ALTER TABLE ADD COLUMN is idempotent-safe with the check below)
	_, err = db.Exec(`ALTER TABLE conversations ADD COLUMN is_live INTEGER NOT NULL DEFAULT 0`)
	if err != nil && !strings.Contains(err.Error(), "duplicate column name") {
		return err
	}
	return nil
}

func createConversation(id, model string) error {
	_, err := db.Exec(
		`INSERT INTO conversations (id, model, created_at) VALUES (?, ?, ?)`,
		id, model, time.Now().UTC().Format(time.RFC3339),
	)
	return err
}

func getConversation(id string) (*conversation, error) {
	var c conversation
	var createdAt string
	var isLive int
	err := db.QueryRow(
		`SELECT id, topic, model, created_at, is_live FROM conversations WHERE id = ?`, id,
	).Scan(&c.ID, &c.Topic, &c.Model, &createdAt, &isLive)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	c.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	c.IsLive = isLive != 0
	return &c, nil
}

func getMessages(conversationID string) ([]message, error) {
	rows, err := db.Query(
		`SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id`,
		conversationID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var msgs []message
	for rows.Next() {
		var m message
		if err := rows.Scan(&m.Role, &m.Content); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

func getOutlineMessages(conversationID string) ([]message, error) {
	rows, err := db.Query(
		`SELECT role, substr(content, 1, 100) FROM messages WHERE conversation_id = ? ORDER BY id`,
		conversationID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var msgs []message
	for rows.Next() {
		var m message
		if err := rows.Scan(&m.Role, &m.Content); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

// getMessagesPaged returns up to limit messages ending at the tail of the
// conversation, skipping offset messages from the end. Messages are returned
// in chronological order. hasMore is true when older messages still exist.
func getMessagesPaged(conversationID string, offset, limit int) ([]message, bool, error) {
	var total int
	if err := db.QueryRow(
		`SELECT COUNT(*) FROM messages WHERE conversation_id = ?`, conversationID,
	).Scan(&total); err != nil {
		return nil, false, err
	}
	rows, err := db.Query(`
		SELECT role, content FROM (
			SELECT id, role, content FROM messages
			WHERE conversation_id = ?
			ORDER BY id DESC LIMIT ? OFFSET ?
		) ORDER BY id ASC`,
		conversationID, limit, offset,
	)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()
	var msgs []message
	for rows.Next() {
		var m message
		if err := rows.Scan(&m.Role, &m.Content); err != nil {
			return nil, false, err
		}
		msgs = append(msgs, m)
	}
	return msgs, total > offset+limit, rows.Err()
}

func appendMessage(conversationID, role, content string) error {
	_, err := db.Exec(
		`INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)`,
		conversationID, role, content,
	)
	return err
}

// listConversations returns conversations that have at least one message, newest first.
func listConversations() ([]conversation, error) {
	rows, err := db.Query(`
		SELECT c.id, c.topic, c.model, c.created_at, c.is_live
		FROM conversations c
		WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)
		ORDER BY c.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var convs []conversation
	for rows.Next() {
		var c conversation
		var createdAt string
		var isLive int
		if err := rows.Scan(&c.ID, &c.Topic, &c.Model, &createdAt, &isLive); err != nil {
			return nil, err
		}
		c.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		c.IsLive = isLive != 0
		convs = append(convs, c)
	}
	return convs, rows.Err()
}

type liveTurn struct {
	Role    string
	Content string
}

// saveLiveSession inserts a live session conversation and its transcript turns in a single transaction.
func saveLiveSession(conversationID, topic string, turns []liveTurn) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(
		`INSERT INTO conversations (id, topic, model, created_at, is_live) VALUES (?, ?, ?, ?, 1)`,
		conversationID, topic, "", time.Now().UTC().Format(time.RFC3339),
	)
	if err != nil {
		return err
	}

	for _, turn := range turns {
		_, err = tx.Exec(
			`INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)`,
			conversationID, turn.Role, turn.Content,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func deleteConversation(id string) error {
	_, err := db.Exec(`DELETE FROM conversations WHERE id = ?`, id)
	return err
}

func setTopic(id, topic string) error {
	_, err := db.Exec(`UPDATE conversations SET topic = ? WHERE id = ?`, topic, id)
	return err
}

func updateModel(id, model string) error {
	_, err := db.Exec(`UPDATE conversations SET model = ? WHERE id = ?`, model, id)
	return err
}

// ── prompts ───────────────────────────────────────────────────────────────────

type promptRow struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Prompt    string `json:"prompt"`
	Favorite  bool   `json:"favorite"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

func listPrompts() ([]promptRow, error) {
	rows, err := db.Query(`SELECT id, title, prompt, favorite, created_at, updated_at FROM prompts ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []promptRow
	for rows.Next() {
		var p promptRow
		var fav int
		if err := rows.Scan(&p.ID, &p.Title, &p.Prompt, &fav, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.Favorite = fav != 0
		out = append(out, p)
	}
	if out == nil {
		out = []promptRow{}
	}
	return out, rows.Err()
}

func upsertPromptRow(p promptRow) (string, error) {
	if p.ID == "" {
		p.ID = newID()
	}
	now := time.Now().UnixMilli()
	if p.CreatedAt == 0 {
		p.CreatedAt = now
	}
	p.UpdatedAt = now
	fav := 0
	if p.Favorite {
		fav = 1
	}
	_, err := db.Exec(`
		INSERT INTO prompts (id, title, prompt, favorite, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			title      = excluded.title,
			prompt     = excluded.prompt,
			favorite   = excluded.favorite,
			updated_at = excluded.updated_at`,
		p.ID, p.Title, p.Prompt, fav, p.CreatedAt, p.UpdatedAt,
	)
	return p.ID, err
}

func deletePromptRow(id string) error {
	_, err := db.Exec(`DELETE FROM prompts WHERE id = ?`, id)
	return err
}

func importPromptRows(items []promptRow) (added, updated, skipped int, err error) {
	existing, err := listPrompts()
	if err != nil {
		return
	}
	type key struct{ title, prompt string }
	byID := make(map[string]bool, len(existing))
	byContent := make(map[key]bool, len(existing))
	for _, p := range existing {
		byID[p.ID] = true
		byContent[key{p.Title, p.Prompt}] = true
	}
	for _, p := range items {
		if p.Title == "" || p.Prompt == "" {
			skipped++
			continue
		}
		if p.ID != "" && byID[p.ID] {
			_, err = upsertPromptRow(p)
			if err != nil {
				return
			}
			updated++
		} else {
			if byContent[key{p.Title, p.Prompt}] {
				skipped++
				continue
			}
			p.ID = ""
			newID, e := upsertPromptRow(p)
			if e != nil {
				err = e
				return
			}
			byID[newID] = true
			byContent[key{p.Title, p.Prompt}] = true
			added++
		}
	}
	return
}
