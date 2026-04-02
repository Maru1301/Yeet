import { aiRequest, aiFetch, PROXY_API } from './api.service';

// Common headers for streaming requests
const commonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Expires': '-1',
};

const gptService = {
  start: {
    path(useAgent = false) {
      return useAgent ? `/agent/chat/start` : `/chat/start`;
    },
    request(payload: unknown, signal: AbortSignal, useAgent = false) {
      return aiRequest.post(this.path(useAgent), payload, { signal });
    },
  },
  models: {
    path() { return `/chat/models`; },
    request(payload: unknown) {
      return aiRequest.post(this.path(), payload);
    },
  },
  conversationList: {
    path() { return `/chat/conversation-list`; },
    request(payload: unknown) {
      return aiRequest.post(this.path(), payload);
    },
  },
  deleteRecord: {
    path() { return `/chat/delete-record`; },
    request(payload: unknown) {
      return aiRequest.post(this.path(), payload);
    },
  },
  genTopic: {
    path() { return `/chat/generate-topic`; },
    request(payload: unknown) {
      return aiRequest.post(this.path(), payload);
    },
  },
  record: {
    path(payload: { conversationId: string }, useAgent = false) {
      return useAgent
        ? `/agent/history/content`
        : `/chat/record/${payload.conversationId}`;
    },
    request(payload: { conversationId: string }, useAgent = false) {
      if (useAgent) {
        return aiRequest.post(this.path(payload, true), payload);
      } else {
        return aiRequest.post(this.path(payload, false), null);
      }
    },
  },
  send: {
    path(useAgent = false) {
      return useAgent
        ? `${PROXY_API}/agent/chat/send`
        : `${PROXY_API}/chat/send`;
    },
    request(payload: unknown, signal: AbortSignal, useAgent = false) {
      return aiFetch(this.path(useAgent), {
        method: 'POST',
        headers: commonHeaders,
        signal,
        body: JSON.stringify(payload),
      });
    },
  },
  ask: {
    path() { return `${PROXY_API}/agent/ask/question-stream`; },
    request(payload: unknown, signal: AbortSignal) {
      return aiFetch(this.path(), {
        method: 'POST',
        headers: commonHeaders,
        signal,
        body: JSON.stringify(payload),
      });
    },
  },
};

export { gptService };
