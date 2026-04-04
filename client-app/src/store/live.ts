// live.ts — Pinia store for Live Mode session state and transcript

import { defineStore } from 'pinia';

export type LiveStatus = 'idle' | 'connecting' | 'active' | 'ending';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isComplete: boolean;
  isInterrupted: boolean;
}

const VOICE_KEY = 'lastUsedVoice';
const DEFAULT_VOICE = 'Aoede';

function loadVoice(): string {
  return localStorage.getItem(VOICE_KEY) || DEFAULT_VOICE;
}

let _entryCounter = 0;
function nextEntryId(): string {
  return `entry-${Date.now()}-${++_entryCounter}`;
}

export const useLiveStore = defineStore('live', {
  state: () => ({
    status: 'idle' as LiveStatus,
    sessionId: null as string | null,
    voice: loadVoice(),
    transcript: [] as TranscriptEntry[],
    isPushToTalk: false,
  }),

  actions: {
    setStatus(status: LiveStatus) {
      this.status = status;
    },

    setSessionId(id: string | null) {
      this.sessionId = id;
    },

    setVoice(voice: string) {
      this.voice = voice;
      localStorage.setItem(VOICE_KEY, voice);
    },

    /** Appends text to the last incomplete entry for the given role, or creates a new entry. */
    appendTranscript(role: 'user' | 'assistant', text: string) {
      const last = this.transcript[this.transcript.length - 1];
      if (last && last.role === role && !last.isComplete) {
        last.text += text;
      } else {
        this.transcript.push({
          id: nextEntryId(),
          role,
          text,
          isComplete: false,
          isInterrupted: false,
        });
      }
    },

    /** Marks the last incomplete entry for the given role as complete. */
    markTurnComplete(role?: 'user' | 'assistant') {
      for (let i = this.transcript.length - 1; i >= 0; i--) {
        const entry = this.transcript[i];
        if (!entry.isComplete && (role === undefined || entry.role === role)) {
          entry.isComplete = true;
          break;
        }
      }
    },

    /** Marks the last incomplete assistant entry as interrupted. */
    markInterrupted() {
      for (let i = this.transcript.length - 1; i >= 0; i--) {
        const entry = this.transcript[i];
        if (entry.role === 'assistant' && !entry.isComplete) {
          entry.isComplete = true;
          entry.isInterrupted = true;
          break;
        }
      }
    },

    reset() {
      this.status = 'idle';
      this.sessionId = null;
      this.transcript = [];
    },
  },
});
