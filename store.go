package main

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	mongoClient *mongo.Client
	mongoDB     *mongo.Database
)

// ── domain types (public surface unchanged) ───────────────────────────────────

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

// ── MongoDB document structs ──────────────────────────────────────────────────

type convDoc struct {
	ID        string    `bson:"_id"`
	Topic     string    `bson:"topic"`
	Model     string    `bson:"model"`
	CreatedAt time.Time `bson:"createdAt"`
	IsLive    bool      `bson:"isLive"`
}

type msgDoc struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"`
	ConversationID string             `bson:"conversationId"`
	Role           string             `bson:"role"`
	Content        string             `bson:"content"`
}

type promptDoc struct {
	ID        string `bson:"_id"`
	Title     string `bson:"title"`
	Prompt    string `bson:"prompt"`
	Favorite  bool   `bson:"favorite"`
	CreatedAt int64  `bson:"createdAt"`
	UpdatedAt int64  `bson:"updatedAt"`
}

// collection shorthands
func convColl() *mongo.Collection   { return mongoDB.Collection("conversations") }
func msgColl() *mongo.Collection    { return mongoDB.Collection("messages") }
func promptColl() *mongo.Collection { return mongoDB.Collection("prompts") }

// ── init ──────────────────────────────────────────────────────────────────────

func initDB(uri string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return err
	}
	if err := client.Ping(ctx, nil); err != nil {
		return err
	}
	mongoClient = client
	mongoDB = client.Database("yeet")

	// Index on messages.conversationId for fast per-conversation lookups
	_, err = msgColl().Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "conversationId", Value: 1}},
	})
	return err
}

// ── conversations ─────────────────────────────────────────────────────────────

func createConversation(id, model string) error {
	_, err := convColl().InsertOne(context.Background(), convDoc{
		ID:        id,
		Model:     model,
		CreatedAt: time.Now().UTC(),
	})
	return err
}

func getConversation(id string) (*conversation, error) {
	var doc convDoc
	err := convColl().FindOne(context.Background(), bson.D{{Key: "_id", Value: id}}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return docToConv(doc), nil
}

// listConversations returns conversations that have at least one message, newest first.
func listConversations() ([]conversation, error) {
	ctx := context.Background()

	// Find all conversationIds that have at least one message
	ids, err := msgColl().Distinct(ctx, "conversationId", bson.D{})
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return []conversation{}, nil
	}

	cursor, err := convColl().Find(ctx,
		bson.D{{Key: "_id", Value: bson.D{{Key: "$in", Value: ids}}}},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var result []conversation
	for cursor.Next(ctx) {
		var doc convDoc
		if err := cursor.Decode(&doc); err != nil {
			return nil, err
		}
		result = append(result, *docToConv(doc))
	}
	return result, cursor.Err()
}

func deleteConversation(id string) error {
	ctx := context.Background()
	// Delete messages first, then the conversation
	if _, err := msgColl().DeleteMany(ctx, bson.D{{Key: "conversationId", Value: id}}); err != nil {
		return err
	}
	_, err := convColl().DeleteOne(ctx, bson.D{{Key: "_id", Value: id}})
	return err
}

func setTopic(id, topic string) error {
	_, err := convColl().UpdateOne(
		context.Background(),
		bson.D{{Key: "_id", Value: id}},
		bson.D{{Key: "$set", Value: bson.D{{Key: "topic", Value: topic}}}},
	)
	return err
}

func updateModel(id, model string) error {
	_, err := convColl().UpdateOne(
		context.Background(),
		bson.D{{Key: "_id", Value: id}},
		bson.D{{Key: "$set", Value: bson.D{{Key: "model", Value: model}}}},
	)
	return err
}

// ── messages ──────────────────────────────────────────────────────────────────

func getMessages(conversationID string) ([]message, error) {
	cursor, err := msgColl().Find(
		context.Background(),
		bson.D{{Key: "conversationId", Value: conversationID}},
		options.Find().SetSort(bson.D{{Key: "_id", Value: 1}}),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	return decodeMsgs(cursor)
}

// getOutlineMessages returns messages with content truncated to 100 code points.
func getOutlineMessages(conversationID string) ([]message, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "conversationId", Value: conversationID}}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
		{{Key: "$project", Value: bson.D{
			{Key: "role", Value: 1},
			{Key: "content", Value: bson.D{
				{Key: "$substrCP", Value: bson.A{"$content", 0, 100}},
			}},
		}}},
	}
	cursor, err := msgColl().Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())
	return decodeMsgs(cursor)
}

// getMessagesPaged returns up to limit messages ending at the tail of the
// conversation, skipping offset messages from the end. Messages are returned
// in chronological order. hasMore is true when older messages still exist.
func getMessagesPaged(conversationID string, offset, limit int) ([]message, bool, error) {
	ctx := context.Background()
	filter := bson.D{{Key: "conversationId", Value: conversationID}}

	total, err := msgColl().CountDocuments(ctx, filter)
	if err != nil {
		return nil, false, err
	}

	// Fetch from the tail: sort DESC, skip offset, take limit — then reverse to chronological
	cursor, err := msgColl().Find(ctx, filter,
		options.Find().
			SetSort(bson.D{{Key: "_id", Value: -1}}).
			SetSkip(int64(offset)).
			SetLimit(int64(limit)),
	)
	if err != nil {
		return nil, false, err
	}
	defer cursor.Close(ctx)

	batch, err := decodeMsgs(cursor)
	if err != nil {
		return nil, false, err
	}
	// Reverse to chronological order
	for i, j := 0, len(batch)-1; i < j; i, j = i+1, j-1 {
		batch[i], batch[j] = batch[j], batch[i]
	}
	return batch, total > int64(offset+limit), nil
}

func appendMessage(conversationID, role, content string) error {
	_, err := msgColl().InsertOne(context.Background(), msgDoc{
		ConversationID: conversationID,
		Role:           role,
		Content:        content,
	})
	return err
}

// ── live sessions ─────────────────────────────────────────────────────────────

type liveTurn struct {
	Role    string
	Content string
}

// saveLiveSession inserts a live-session conversation and its transcript turns.
// Note: MongoDB transactions require a replica set. Sequential inserts are used
// here for compatibility with standalone MongoDB (Docker/k8s single-node).
func saveLiveSession(conversationID, topic string, turns []liveTurn) error {
	ctx := context.Background()

	_, err := convColl().InsertOne(ctx, convDoc{
		ID:        conversationID,
		Topic:     topic,
		CreatedAt: time.Now().UTC(),
		IsLive:    true,
	})
	if err != nil {
		return err
	}
	if len(turns) == 0 {
		return nil
	}

	docs := make([]any, len(turns))
	for i, t := range turns {
		docs[i] = msgDoc{
			ConversationID: conversationID,
			Role:           t.Role,
			Content:        t.Content,
		}
	}
	_, err = msgColl().InsertMany(ctx, docs)
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
	cursor, err := promptColl().Find(
		context.Background(),
		bson.D{},
		options.Find().SetSort(bson.D{{Key: "updatedAt", Value: -1}}),
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var out []promptRow
	for cursor.Next(context.Background()) {
		var doc promptDoc
		if err := cursor.Decode(&doc); err != nil {
			return nil, err
		}
		out = append(out, promptRow{
			ID:        doc.ID,
			Title:     doc.Title,
			Prompt:    doc.Prompt,
			Favorite:  doc.Favorite,
			CreatedAt: doc.CreatedAt,
			UpdatedAt: doc.UpdatedAt,
		})
	}
	if out == nil {
		out = []promptRow{}
	}
	return out, cursor.Err()
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

	_, err := promptColl().UpdateOne(
		context.Background(),
		bson.D{{Key: "_id", Value: p.ID}},
		bson.D{{Key: "$set", Value: bson.D{
			{Key: "title", Value: p.Title},
			{Key: "prompt", Value: p.Prompt},
			{Key: "favorite", Value: p.Favorite},
			{Key: "createdAt", Value: p.CreatedAt},
			{Key: "updatedAt", Value: p.UpdatedAt},
		}}},
		options.Update().SetUpsert(true),
	)
	return p.ID, err
}

func deletePromptRow(id string) error {
	_, err := promptColl().DeleteOne(context.Background(), bson.D{{Key: "_id", Value: id}})
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

// ── helpers ───────────────────────────────────────────────────────────────────

func docToConv(doc convDoc) *conversation {
	return &conversation{
		ID:        doc.ID,
		Topic:     doc.Topic,
		Model:     doc.Model,
		CreatedAt: doc.CreatedAt,
		IsLive:    doc.IsLive,
	}
}

func decodeMsgs(cursor *mongo.Cursor) ([]message, error) {
	var result []message
	for cursor.Next(context.Background()) {
		var doc msgDoc
		if err := cursor.Decode(&doc); err != nil {
			return nil, err
		}
		result = append(result, message{Role: doc.Role, Content: doc.Content})
	}
	return result, cursor.Err()
}
