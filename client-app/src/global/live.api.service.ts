// live.api.service.ts — WebSocket connection + message handling for Live Mode

import { aiRequest } from './api.service';

// ── Message types: Browser → Go ───────────────────────────────────────────────

export interface ReadyMessage {
  type: 'ready';
}

export interface AudioChunkMessage {
  type: 'audio';
  data: string; // base64 PCM 16-bit 16kHz mono
}

export interface EndSessionMessage {
  type: 'end';
}

export type BrowserMessage = ReadyMessage | AudioChunkMessage | EndSessionMessage;

// ── Message types: Go → Browser ───────────────────────────────────────────────

export interface SessionReadyMessage {
  type: 'session_ready';
  sessionId: string;
}

export interface AudioOutputMessage {
  type: 'audio';
  data: string; // base64 PCM 16-bit 24kHz mono
}

export interface TranscriptMessage {
  type: 'transcript';
  role: 'user' | 'assistant';
  text: string;
  turnComplete?: boolean;
}

export interface InterruptedMessage {
  type: 'interrupted';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface SessionSavedMessage {
  type: 'session_saved';
  sessionId: string;
  topic: string;
}

export type ServerMessage =
  | SessionReadyMessage
  | AudioOutputMessage
  | TranscriptMessage
  | InterruptedMessage
  | ErrorMessage
  | SessionSavedMessage;

// ── Voice preset ──────────────────────────────────────────────────────────────

export interface VoicePreset {
  id: string;
  displayName: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

function getWsBase(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}

export const liveApiService = {
  /** Opens the WebSocket connection to the Go Live relay. */
  connect(model: string, voice: string): WebSocket {
    const url = `${getWsBase()}/live/ws?model=${encodeURIComponent(model)}&voice=${encodeURIComponent(voice)}`;
    return new WebSocket(url);
  },

  /** Sends a typed JSON message over the WebSocket. */
  send(ws: WebSocket, message: BrowserMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  },

  /** Fetches the available voice presets from the backend. */
  async getVoices(): Promise<VoicePreset[]> {
    const response = await aiRequest.post<VoicePreset[]>('/live/voices', null);
    return response.data;
  },
};
