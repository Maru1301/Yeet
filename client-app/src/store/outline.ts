// outline.ts — Pinia store for Chat Outline panel state

import { defineStore } from 'pinia';
import { gptService } from '../global/gpt.api.service';
import { deriveLabel } from '../global/outline.utils';

export interface OutlineEntry {
  index: number;
  role: 'user' | 'assistant';
  label: string;
}

export interface OutlineState {
  conversationId: string | null;
  entries: OutlineEntry[];
  activeIndex: number;
}

export const useOutlineStore = defineStore('outline', {
  state: (): OutlineState => ({
    conversationId: null,
    entries: [],
    activeIndex: 0,
  }),

  actions: {
    setActiveIndex(i: number) {
      this.activeIndex = i;
    },

    async fetchEntries(conversationId: string) {
      this.conversationId = conversationId;
      this.entries = [];
      try {
        const resp = await gptService.outline.request(conversationId);
        this.entries = (resp?.data?.entries ?? []) as OutlineEntry[];
      } catch (err) {
        console.error('outline fetchEntries:', err);
        this.entries = [];
      }
    },

    appendEntry(content: string, role: 'user' | 'assistant') {
      this.entries.push({
        index: this.entries.length,
        role,
        label: deriveLabel(content),
      });
    },
  },
});
