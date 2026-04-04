package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

//go:embed all:client-app/dist
var staticFiles embed.FS

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
	mux.HandleFunc("/live/voices", cors(handleLiveVoices()))
	mux.HandleFunc("/live/ws", handleLiveWS(apiKey))
	mux.HandleFunc("/", handleStatic())

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

func handleStart(_ string) http.HandlerFunc {
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

func handleModels(_ string) http.HandlerFunc {
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
		IsLive         bool   `json:"isLive"`
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
				IsLive:         c.IsLive,
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

// ── Live Mode ─────────────────────────────────────────────────────────────────

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

const geminiLiveURL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"

// handleLiveVoices returns the hardcoded list of Gemini voice presets.
func handleLiveVoices() http.HandlerFunc {
	type voice struct {
		ID          string `json:"id"`
		DisplayName string `json:"displayName"`
	}
	voices := []voice{
		{ID: "Aoede", DisplayName: "Aoede — Warm"},
		{ID: "Charon", DisplayName: "Charon — Deep"},
		{ID: "Fenrir", DisplayName: "Fenrir — Energetic"},
		{ID: "Kore", DisplayName: "Kore — Clear"},
		{ID: "Puck", DisplayName: "Puck — Expressive"},
	}
	return func(w http.ResponseWriter, r *http.Request) {
		jsonResp(w, voices)
	}
}

// handleLiveWS upgrades browser connections to WebSocket and relays to Gemini Live API.
func handleLiveWS(apiKey string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		model := r.URL.Query().Get("model")
		voice := r.URL.Query().Get("voice")
		if model == "" {
			model = "gemini-2.5-flash-native-audio-preview-12-2025"
		}
		if voice == "" {
			voice = "Aoede"
		}

		// Upgrade browser connection
		browserWS, err := wsUpgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("liveWS upgrade: %v", err)
			return
		}
		defer browserWS.Close()

		// Serialise all writes to browserWS — gorilla requires it
		var wsMu sync.Mutex
		wsSend := func(v any) {
			wsMu.Lock()
			defer wsMu.Unlock()
			browserWS.WriteJSON(v)
		}

		// Connect to Gemini Live
		geminiURL := fmt.Sprintf("%s?key=%s", geminiLiveURL, apiKey)
		geminiWS, _, err := websocket.DefaultDialer.Dial(geminiURL, nil)
		if err != nil {
			log.Printf("liveWS gemini dial: %v", err)
			wsSend(map[string]string{"type": "error", "message": "failed to connect to Gemini: " + err.Error()})
			return
		}
		defer geminiWS.Close()

		// Send setup message to Gemini — field names must be camelCase JSON
		setup := map[string]any{
			"setup": map[string]any{
				"model": "models/" + model,
				"generationConfig": map[string]any{
					"responseModalities": []string{"AUDIO"},
					"speechConfig": map[string]any{
						"voiceConfig": map[string]any{
							"prebuiltVoiceConfig": map[string]string{
								"voiceName": voice,
							},
						},
					},
				},
				"inputAudioTranscription":  map[string]any{},
				"outputAudioTranscription": map[string]any{},
			},
		}
		if err := geminiWS.WriteJSON(setup); err != nil {
			log.Printf("liveWS gemini setup write: %v", err)
			wsSend(map[string]string{"type": "error", "message": "setup failed: " + err.Error()})
			return
		}
		log.Printf("liveWS: setup sent model=%s voice=%s", model, voice)

		sessionID := newID()
		var transcript []liveTurn
		var transcriptMu sync.Mutex
		var currentRole string
		var currentText strings.Builder

		// done: closed by goroutine A when browser disconnects or sends "end"
		// geminiErr: goroutine B sends an error message then closes it
		done := make(chan struct{})
		geminiErr := make(chan string, 1)

		// Goroutine A: browser → Gemini
		go func() {
			defer close(done)
			for {
				_, msg, err := browserWS.ReadMessage()
				if err != nil {
					return
				}
				var env map[string]any
				if err := json.Unmarshal(msg, &env); err != nil {
					continue
				}
				msgType, _ := env["type"].(string)
				switch msgType {
				case "end":
					return
				case "audio":
					data, _ := env["data"].(string)
					geminiMsg := map[string]any{
						"realtimeInput": map[string]any{
							"mediaChunks": []map[string]any{
								{"mimeType": "audio/pcm;rate=16000", "data": data},
							},
						},
					}
					geminiWS.WriteJSON(geminiMsg)
				}
			}
		}()

		// Goroutine B: Gemini → browser + transcript buffer
		go func() {
			for {
				_, msg, err := geminiWS.ReadMessage()
				if err != nil {
					select {
					case geminiErr <- "Gemini connection closed: " + err.Error():
					default:
					}
					return
				}
				var env map[string]any
				if err := json.Unmarshal(msg, &env); err != nil {
					log.Printf("liveWS gemini unmarshal: %v | raw: %.200s", err, msg)
					continue
				}
				log.Printf("liveWS gemini msg keys: %v", msgKeys(env))

				// BidiGenerateContentSetupComplete
				if _, ok := env["setupComplete"]; ok {
					log.Printf("liveWS: setupComplete received, sending session_ready")
					wsSend(map[string]string{
						"type":      "session_ready",
						"sessionId": sessionID,
					})
					continue
				}

				// BidiGenerateContentServerContent
				if sc, ok := env["serverContent"].(map[string]any); ok {
					log.Printf("liveWS serverContent keys: %v", msgKeys(sc))
					// Interrupted signal
					if interrupted, _ := sc["interrupted"].(bool); interrupted {
						transcriptMu.Lock()
						if currentText.Len() > 0 {
							transcript = append(transcript, liveTurn{Role: currentRole, Content: currentText.String()})
							currentText.Reset()
						}
						transcriptMu.Unlock()
						wsSend(map[string]string{"type": "interrupted"})
						continue
					}

					// Model turn — extract audio only; text parts are internal reasoning
					if modelTurn, ok := sc["modelTurn"].(map[string]any); ok {
						if parts, ok := modelTurn["parts"].([]any); ok {
							for _, p := range parts {
								part, _ := p.(map[string]any)
								if inlineData, ok := part["inlineData"].(map[string]any); ok {
									audioData, _ := inlineData["data"].(string)
									if audioData != "" {
										wsSend(map[string]string{"type": "audio", "data": audioData})
									}
								}
							}
						}
					}

					// outputTranscription — actual spoken text from the model
					if outputTranscription, ok := sc["outputTranscription"].(map[string]any); ok {
						if text, ok := outputTranscription["text"].(string); ok && text != "" {
							transcriptMu.Lock()
							if currentRole != "assistant" && currentText.Len() > 0 {
								transcript = append(transcript, liveTurn{Role: currentRole, Content: currentText.String()})
								currentText.Reset()
							}
							currentRole = "assistant"
							currentText.WriteString(text)
							transcriptMu.Unlock()
							wsSend(map[string]string{"type": "transcript", "role": "assistant", "text": text})
						}
					}

					// inputTranscription — user's speech-to-text
					if inputTranscription, ok := sc["inputTranscription"].(map[string]any); ok {
						if text, ok := inputTranscription["text"].(string); ok && text != "" {
							transcriptMu.Lock()
							if currentRole != "user" && currentText.Len() > 0 {
								transcript = append(transcript, liveTurn{Role: currentRole, Content: currentText.String()})
								currentText.Reset()
							}
							currentRole = "user"
							currentText.WriteString(text)
							transcriptMu.Unlock()
							wsSend(map[string]string{"type": "transcript", "role": "user", "text": text})
						}
					}

					// Turn complete
					if turnComplete, _ := sc["turnComplete"].(bool); turnComplete {
						transcriptMu.Lock()
						if currentText.Len() > 0 {
							transcript = append(transcript, liveTurn{Role: currentRole, Content: currentText.String()})
							currentText.Reset()
						}
						transcriptMu.Unlock()
					}
				}
			}
		}()

		// Wait for session end — either browser closes or Gemini errors
		select {
		case <-done:
		case errMsg := <-geminiErr:
			log.Printf("liveWS: gemini error: %s", errMsg)
			wsSend(map[string]string{"type": "error", "message": errMsg})
			// drain browser goroutine
			browserWS.Close()
			<-done
		}

		// Save transcript to SQLite
		transcriptMu.Lock()
		if currentText.Len() > 0 {
			transcript = append(transcript, liveTurn{Role: currentRole, Content: currentText.String()})
		}
		savedTranscript := transcript
		transcriptMu.Unlock()

		topic := "Live Session"
		if len(savedTranscript) > 0 {
			// Generate topic from first user turn
			for _, t := range savedTranscript {
				if t.Role == "user" && len(t.Content) > 0 {
					words := strings.Fields(t.Content)
					if len(words) > 5 {
						words = words[:5]
					}
					topic = strings.Join(words, " ")
					break
				}
			}
		}

		if len(savedTranscript) > 0 {
			if err := saveLiveSession(sessionID, topic, savedTranscript); err != nil {
				log.Printf("saveLiveSession: %v", err)
			}
		}

		browserWS.WriteJSON(map[string]string{
			"type":      "session_saved",
			"sessionId": sessionID,
			"topic":     topic,
		})
	}
}

func handleStub() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "agent endpoints not implemented", http.StatusNotImplemented)
	}
}

func handleStatic() http.HandlerFunc {
	sub, err := fs.Sub(staticFiles, "client-app/dist")
	if err != nil {
		log.Fatalf("handleStatic: %v", err)
	}
	fileServer := http.FileServer(http.FS(sub))
	return func(w http.ResponseWriter, r *http.Request) {
		// Check if the requested file exists in the embedded FS
		name := strings.TrimPrefix(r.URL.Path, "/")
		if name == "" {
			name = "index.html"
		}
		if _, err := fs.Stat(sub, name); err != nil {
			// SPA fallback: serve index.html for unknown paths (client-side routing)
			data, err := fs.ReadFile(sub, "index.html")
			if err != nil {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(data)
			return
		}
		fileServer.ServeHTTP(w, r)
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
		role := m.Role
		if role == "assistant" {
			role = "model"
		}
		out[i] = gContent{Role: role, Parts: []gPart{{Text: m.Content}}}
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

func msgKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
