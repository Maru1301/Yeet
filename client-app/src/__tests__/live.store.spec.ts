import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLiveStore } from '../store/live';

describe('useLiveStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  describe('initial state', () => {
    it('has idle status', () => {
      const store = useLiveStore();
      expect(store.status).toBe('idle');
    });

    it('has null sessionId', () => {
      const store = useLiveStore();
      expect(store.sessionId).toBeNull();
    });

    it('defaults voice to Aoede when localStorage is empty', () => {
      const store = useLiveStore();
      expect(store.voice).toBe('Aoede');
    });

    it('restores voice from localStorage', () => {
      localStorage.setItem('lastUsedVoice', 'Charon');
      const store = useLiveStore();
      expect(store.voice).toBe('Charon');
    });

    it('has empty transcript', () => {
      const store = useLiveStore();
      expect(store.transcript).toHaveLength(0);
    });

    it('has isPushToTalk false', () => {
      const store = useLiveStore();
      expect(store.isPushToTalk).toBe(false);
    });
  });

  describe('setStatus', () => {
    it('updates status through all valid transitions', () => {
      const store = useLiveStore();
      store.setStatus('connecting');
      expect(store.status).toBe('connecting');
      store.setStatus('active');
      expect(store.status).toBe('active');
      store.setStatus('ending');
      expect(store.status).toBe('ending');
      store.setStatus('idle');
      expect(store.status).toBe('idle');
    });
  });

  describe('setVoice', () => {
    it('updates voice state and persists to localStorage', () => {
      const store = useLiveStore();
      store.setVoice('Puck');
      expect(store.voice).toBe('Puck');
      expect(localStorage.getItem('lastUsedVoice')).toBe('Puck');
    });
  });

  describe('appendTranscript', () => {
    it('creates a new entry for first message', () => {
      const store = useLiveStore();
      store.appendTranscript('user', 'Hello');
      expect(store.transcript).toHaveLength(1);
      expect(store.transcript[0]).toMatchObject({
        role: 'user',
        text: 'Hello',
        isComplete: false,
        isInterrupted: false,
      });
    });

    it('appends text to last incomplete entry of same role', () => {
      const store = useLiveStore();
      store.appendTranscript('assistant', 'Hello ');
      store.appendTranscript('assistant', 'world');
      expect(store.transcript).toHaveLength(1);
      expect(store.transcript[0].text).toBe('Hello world');
    });

    it('creates a new entry when role changes', () => {
      const store = useLiveStore();
      store.appendTranscript('user', 'Hi');
      store.appendTranscript('assistant', 'Hello');
      expect(store.transcript).toHaveLength(2);
    });

    it('creates a new entry after previous turn was completed', () => {
      const store = useLiveStore();
      store.appendTranscript('assistant', 'First');
      store.markTurnComplete('assistant');
      store.appendTranscript('assistant', 'Second');
      expect(store.transcript).toHaveLength(2);
    });
  });

  describe('markTurnComplete', () => {
    it('marks the last incomplete entry of a given role as complete', () => {
      const store = useLiveStore();
      store.appendTranscript('assistant', 'Hello');
      store.markTurnComplete('assistant');
      expect(store.transcript[0].isComplete).toBe(true);
    });

    it('marks the last incomplete entry regardless of role when no role specified', () => {
      const store = useLiveStore();
      store.appendTranscript('user', 'Hi');
      store.markTurnComplete();
      expect(store.transcript[0].isComplete).toBe(true);
    });
  });

  describe('markInterrupted', () => {
    it('marks the last incomplete assistant entry as interrupted and complete', () => {
      const store = useLiveStore();
      store.appendTranscript('assistant', 'I was saying');
      store.markInterrupted();
      expect(store.transcript[0].isInterrupted).toBe(true);
      expect(store.transcript[0].isComplete).toBe(true);
    });

    it('does not mark user entries as interrupted', () => {
      const store = useLiveStore();
      store.appendTranscript('user', 'Hello');
      store.appendTranscript('assistant', 'I was');
      store.markInterrupted();
      expect(store.transcript[0].isInterrupted).toBe(false);
      expect(store.transcript[1].isInterrupted).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears transcript, sessionId, and resets status to idle', () => {
      const store = useLiveStore();
      store.setStatus('active');
      store.setSessionId('test-id');
      store.appendTranscript('user', 'Hello');
      store.reset();
      expect(store.status).toBe('idle');
      expect(store.sessionId).toBeNull();
      expect(store.transcript).toHaveLength(0);
    });

    it('does not clear voice on reset', () => {
      const store = useLiveStore();
      store.setVoice('Fenrir');
      store.reset();
      expect(store.voice).toBe('Fenrir');
    });
  });
});
