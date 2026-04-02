import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    noAuthMessage: 'No permission to access',
    ai: {
      token: '' as string,
    },
  }),
  actions: {
    updateNoAuthMessage(value: string) {
      this.noAuthMessage = value;
    },
    updateAIToken(value: string) {
      this.ai.token = value;
    },
    async getAIToken() {
      // TODO: implement token refresh if needed
    },
  },
});
