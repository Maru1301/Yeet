package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

// ── frontend request / response shapes ───────────────────────────────────────

type startReq struct {
	Model string `json:"Model"`
}

type sendReq struct {
	ConversationID string `json:"ConversationId"`
	Content        string `json:"Content"`
	Model          string `json:"Model"`
}

type genTopicReq struct {
	ConversationID string `json:"ConversationId"`
}

type deleteReq struct {
	ConversationID string `json:"conversationId"`
}

// ── Gemini API shapes ─────────────────────────────────────────────────────────

type gPart struct {
	Text string `json:"text"`
}

type gContent struct {
	Role  string  `json:"role"`
	Parts []gPart `json:"parts"`
}

type gRequest struct {
	Contents []gContent `json:"contents"`
}

type gStreamChunk struct {
	Candidates []struct {
		Content      gContent `json:"content"`
		FinishReason string   `json:"finishReason"`
	} `json:"candidates"`
}

type gGenerateResp struct {
	Candidates []struct {
		Content gContent `json:"content"`
	} `json:"candidates"`
}

// ── main ──────────────────────────────────────────────────────────────────────

func main() {
	apiKey := os.Getenv("API_KEY")
	if apiKey == "" {
		log.Fatal("API_KEY environment variable is required (Google AI Studio API key)")
	}
	port := getEnv("PORT", "8080")
	dbPath := getEnv("DB_PATH", "yeet.db")

	if err := initDB(dbPath); err != nil {
		log.Fatalf("initDB: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/chat/start", cors(handleStart(apiKey)))
	mux.HandleFunc("/chat/models", cors(handleModels(apiKey)))
	mux.HandleFunc("/chat/send", cors(handleSend(apiKey)))
	mux.HandleFunc("/chat/conversation-list", cors(handleConversationList()))
	mux.HandleFunc("/chat/delete-record", cors(handleDeleteRecord()))
	mux.HandleFunc("/chat/generate-topic", cors(handleGenTopic(apiKey)))
	mux.HandleFunc("/chat/record/", cors(handleRecord()))
	mux.HandleFunc("/agent/", cors(handleStub()))

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

// ── middleware ────────────────────────────────────────────────────────────────

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control, Pragma, Expires")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

// ── handlers ──────────────────────────────────────────────────────────────────

func handleStart(apiKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req startReq
		json.NewDecoder(r.Body).Decode(&req)
		model := req.Model
		if model == "" {
			model = defaultModel
		}
		id := newID()
		if err := createConversation(id, model); err != nil {
			log.Printf("createConversation: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		jsonResp(w, map[string]string{"conversationId": id})
	}
}

func handleModels(apiKey string) http.HandlerFunc {
	type model struct {
		Name        string `json:"name"`
		DisplayName string `json:"displayName"`
		IsAgent     bool   `json:"isAgent"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		// url := fmt.Sprintf("%s?key=%s&pageSize=1000", geminiBase, apiKey)
		// resp, err := http.Get(url)
		// if err != nil {
		// 	log.Printf("listModels: %v", err)
		// 	http.Error(w, "failed to list models", http.StatusBadGateway)
		// 	return
		// }
		// defer resp.Body.Close()

		var result struct {
			Models []struct {
				Name             string   `json:"name"`
				DisplayName      string   `json:"displayName"`
				SupportedMethods []string `json:"supportedGenerationMethods"`
			} `json:"models"`
		}
		// if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		// 	log.Printf("listModels decode: %v", err)
		// 	http.Error(w, "failed to decode model list", http.StatusInternalServerError)
		// 	return
		// }

		result.Models = append(result.Models, struct {
			Name             string   `json:"name"`
			DisplayName      string   `json:"displayName"`
			SupportedMethods []string `json:"supportedGenerationMethods"`
		}{
			Name:             "gemini-2.5-flash",
			DisplayName:      "Gemini 2.5 Flash",
			SupportedMethods: []string{"streamGenerateContent"},
		})

		//  var models []model
		// for _, m := range result.Models {
		// 	for _, method := range m.SupportedMethods {
		// 		if method == "streamGenerateContent" {
		// 			// name is "models/gemini-xxx" — strip the prefix
		// 			name := strings.TrimPrefix(m.Name, "models/")
		// 			models = append(models, model{Name: name, DisplayName: m.DisplayName})
		// 			break
		// 		}
		// 	}
		// }
		jsonResp(w, result.Models)
	}
}

func handleSend(apiKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req sendReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		conv, err := getConversation(req.ConversationID)
		if err != nil {
			log.Printf("getConversation: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		if conv == nil {
			// Auto-create if not found (e.g. client sent a message before /start)
			model := req.Model
			if model == "" {
				model = defaultModel
			}
			if err := createConversation(req.ConversationID, model); err != nil {
				log.Printf("createConversation: %v", err)
				http.Error(w, "internal error", http.StatusInternalServerError)
				return
			}
		} else if req.Model != "" && req.Model != conv.Model {
			if err := updateModel(conv.ID, req.Model); err != nil {
				log.Printf("updateModel: %v", err)
			}
		}

		if err := appendMessage(req.ConversationID, "user", req.Content); err != nil {
			log.Printf("appendMessage user: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		msgs, err := getMessages(req.ConversationID)
		if err != nil {
			log.Printf("getMessages: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		model := req.Model
		if model == "" {
			if conv != nil {
				model = conv.Model
			} else {
				model = defaultModel
			}
		}

		// Set SSE headers before any write so they are included in the 200 response
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("X-Accel-Buffering", "no")

		responseText := streamGemini(w, msgs, model, apiKey)

		if responseText != "" {
			if err := appendMessage(req.ConversationID, "model", responseText); err != nil {
				log.Printf("appendMessage model: %v", err)
			}
		}
	}
}

func handleConversationList() http.HandlerFunc {
	type item struct {
		ConversationID string `json:"conversationId"`
		Topic          string `json:"topic"`
		CreatedAt      string `json:"createdAt"`
		IsAgent        bool   `json:"isAgent"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		convs, err := listConversations()
		if err != nil {
			log.Printf("listConversations: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		items := make([]item, len(convs))
		for i, c := range convs {
			items[i] = item{
				ConversationID: c.ID,
				Topic:          c.Topic,
				CreatedAt:      c.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			}
		}
		jsonResp(w, items)
	}
}

func handleDeleteRecord() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req deleteReq
		json.NewDecoder(r.Body).Decode(&req)
		if err := deleteConversation(req.ConversationID); err != nil {
			log.Printf("deleteConversation: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}
		jsonResp(w, map[string]bool{"success": true})
	}
}

func handleGenTopic(apiKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req genTopicReq
		json.NewDecoder(r.Body).Decode(&req)

		conv, err := getConversation(req.ConversationID)
		if err != nil {
			log.Printf("getConversation: %v", err)
		}
		if conv != nil {
			msgs, err := getMessages(req.ConversationID)
			if err != nil {
				log.Printf("getMessages for topic: %v", err)
			} else if topic := generateTopic(msgs, conv.Model, apiKey); topic != "" {
				if err := setTopic(req.ConversationID, topic); err != nil {
					log.Printf("setTopic: %v", err)
				}
			}
		}
		jsonResp(w, map[string]bool{"success": true})
	}
}

func handleRecord() http.HandlerFunc {
	type historyItem struct {
		Role struct {
			Label string `json:"Label"`
		} `json:"Role"`
		Items []struct {
			Text string `json:"Text"`
		} `json:"Items"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		// path: /chat/record/{conversationId}
		parts := strings.Split(strings.TrimSuffix(r.URL.Path, "/"), "/")
		id := parts[len(parts)-1]

		msgs, err := getMessages(id)
		if err != nil {
			log.Printf("getMessages: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
			return
		}

		history := make([]historyItem, 0, len(msgs))
		for _, m := range msgs {
			var item historyItem
			item.Role.Label = m.Role
			if m.Role == "model" {
				item.Role.Label = "assistant"
			}
			item.Items = []struct {
				Text string `json:"Text"`
			}{{Text: m.Content}}
			history = append(history, item)
		}
		jsonResp(w, map[string]any{"ChatHistory": history})
	}
}

func handleStub() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "agent endpoints not implemented", http.StatusNotImplemented)
	}
}

// ── Gemini client ─────────────────────────────────────────────────────────────

const (
	geminiBase   = "https://generativelanguage.googleapis.com/v1beta/models"
	defaultModel = "gemini-2.5-flash"
)

func toContents(msgs []message) []gContent {
	out := make([]gContent, len(msgs))
	for i, m := range msgs {
		out[i] = gContent{Role: m.Role, Parts: []gPart{{Text: m.Content}}}
	}
	return out
}

// streamGemini forwards Gemini's SSE response to w as {"v":"..."} chunks.
// Returns the full accumulated response text.
func streamGemini(w http.ResponseWriter, msgs []message, model, apiKey string) string {
	body, _ := json.Marshal(gRequest{Contents: toContents(msgs)})
	url := fmt.Sprintf("%s/%s:streamGenerateContent?key=%s&alt=sse", geminiBase, model, apiKey)

	log.Printf("streamGemini: calling %s/%s model=%s msgs=%d", geminiBase, model, model, len(msgs))
	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		log.Printf("streamGemini: http.Post error: %v", err)
		sseError(w, "upstream error: "+err.Error())
		return ""
	}
	defer resp.Body.Close()
	log.Printf("streamGemini: gemini status=%d", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		log.Printf("streamGemini: gemini error body: %s", b)
		sseError(w, fmt.Sprintf("upstream %d: %s", resp.StatusCode, b))
		return ""
	}

	flusher, _ := w.(http.Flusher)

	var full strings.Builder
	chunks := 0
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		var chunk gStreamChunk
		if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &chunk); err != nil {
			log.Printf("streamGemini: unmarshal error: %v | line: %.200s", err, line)
			continue
		}
		if len(chunk.Candidates) == 0 || len(chunk.Candidates[0].Content.Parts) == 0 {
			continue
		}
		text := chunk.Candidates[0].Content.Parts[0].Text
		if text == "" {
			continue
		}
		chunks++
		full.WriteString(text)
		data, _ := json.Marshal(map[string]string{"v": text})
		fmt.Fprintf(w, "%s\n\n", data)
		if flusher != nil {
			flusher.Flush()
		}
	}
	if err := scanner.Err(); err != nil {
		log.Printf("streamGemini: scanner error: %v", err)
	}
	log.Printf("streamGemini: done, chunks=%d total_len=%d", chunks, full.Len())
	return full.String()
}

// generateTopic asks Gemini (non-streaming) for a short conversation title.
func generateTopic(msgs []message, model, apiKey string) string {
	contents := toContents(msgs)
	contents = append(contents, gContent{
		Role:  "user",
		Parts: []gPart{{Text: "Summarize this conversation as a title in 5 words or fewer. Reply with only the title, no punctuation."}},
	})
	body, _ := json.Marshal(gRequest{Contents: contents})
	url := fmt.Sprintf("%s/%s:generateContent?key=%s", geminiBase, model, apiKey)

	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	var result gGenerateResp
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || len(result.Candidates) == 0 {
		return ""
	}
	if len(result.Candidates[0].Content.Parts) == 0 {
		return ""
	}
	return strings.TrimSpace(result.Candidates[0].Content.Parts[0].Text)
}

// ── helpers ───────────────────────────────────────────────────────────────────

func jsonResp(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func sseError(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "text/event-stream")
	data, _ := json.Marshal(map[string]string{"e": msg})
	fmt.Fprintf(w, "%s\n\n", data)
}

func newID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
