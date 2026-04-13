# ── Stage 1: build Vue frontend ──────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client-app

COPY client-app/package*.json ./
RUN npm ci

COPY client-app/ ./
RUN npm run build:Release

# ── Stage 2: build Go binary ──────────────────────────────────────────────────
FROM golang:1.25-alpine AS go-builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY *.go ./
# bring in the compiled frontend so `go:embed all:client-app/dist` is satisfied
COPY --from=frontend-builder /app/client-app/dist ./client-app/dist

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o yeet .

# ── Stage 3: minimal runtime image ───────────────────────────────────────────
FROM alpine:3.21
WORKDIR /app

COPY --from=go-builder /app/yeet .

EXPOSE 8080

# Required:  API_KEY    — Google AI Studio key
# Optional:  MONGO_URI  — defaults to mongodb://localhost:27017
#            PORT       — defaults to 8080
ENTRYPOINT ["./yeet"]
