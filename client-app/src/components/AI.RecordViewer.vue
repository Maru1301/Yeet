<template>
  <div class="fill-height d-flex flex-column justify-center align-center">
    <v-card flat
            class="fill-height d-flex flex-column">

      <v-card-text class="chat-bg">
        <v-list nav
                width="420"
                class="ml-5 pa-0">
          <v-list-item class="chat-bg">
            <div class="text-h5 font-weight-bold chat-bg">
              <span class="title-text">AI Chat</span> <span class="gradient-text text-uppercase">{{
                department ? department : "Workspace" }}</span>
            </div>
            <div class="d-flex subtitleGPT chat-bg">
              <span class="text-primary font-weight-medium">Conversation Records</span>
            </div>
          </v-list-item>
        </v-list>
      </v-card-text>

      <div class="chat-bg fill-height d-flex flex-column"
           style="width: 100vw;">
        <!-- No Data Message -->
        <div v-if="!isLoading && (!records || records.length === 0 || filteredRecords.length === 0)"
             class="d-flex flex-column align-center justify-center flex-grow-1">
          <div class="no-data-container text-center">
            <v-icon size="64"
                    color="grey-lighten-1"
                    class="mb-4">mdi-message-text-outline</v-icon>
            <h3 class="text-grey-darken-1 mb-2">No Data</h3>
            <p class="text-grey-darken-1">
              No conversation records found<br>
              <small>Data is only kept for 30 days</small>
            </p>
          </div>
        </div>

        <!-- Chat Records -->
        <div v-if="!isLoading && records && records.length > 0 && filteredRecords.length > 0"
             class="d-flex flex-column align-center flex-grow-1 flex-shrink-1">
          <div ref="chatBox"
               class="chatbox mt-6">
            <div class="mx-2">
              <div v-for="(record, index) in filteredRecords"
                   :key="record.id ?? index">
                <div v-if="record.Role?.Label == 'user' && record.Items && record.Items[0]?.Text"
                     class="d-flex justify-end align-end mb-3 user-record-row">
                  <div v-if="record.Items[0].Text"
                       class="user-actions-wrap">
                    <ChatActions :chatId="conversationId"
                                 :message="{ markdownContent: record.Items[0].Text }"
                                 :useAgent="isAgentRecord"
                                 :hideShare="true" />
                  </div>
                  <div class="d-flex flex-column"
                       style="min-width: 0">
                    <div class="d-flex flex-column align-end chat-user pt-2 pb-2 pr-4 pl-4">
                      <div v-if="record.Items && record.Items[0]?.Text"
                           class="user-content"
                           v-html="convertMarkdown(record.Items[0].Text)">
                      </div>
                      <img v-if="record.image"
                           :src="record.image"
                           alt="User's Image"
                           class="mt-2">
                    </div>
                  </div>
                </div>
                <div v-else-if="record.Role?.Label == 'assistant'"
                     class="d-flex mb-3">
                  <img class="mr-3 bot-avatar"
                       :src="yeetAvatar"
                       alt="AI Chat" />
                  <div class="d-flex flex-column"
                       style="min-width: 0; flex: 1">
                    <div class="d-flex flex-column align-end chat-bot pt-2 pb-3 pr-4 pl-4">
                      <div class="bot-content"
                           v-html="convertMarkdown(record.Items && record.Items[0] ? record.Items[0].Text : '')"></div>
                    </div>
                    <div class="d-flex justify-end mt-1">
                      <ChatActions :chatId="conversationId"
                                   :message="{ markdownContent: record.Items?.[0]?.Text ?? '' }"
                                   :useAgent="isAgentRecord"
                                   :hideShare="true" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-footer-fixed">
          <div class="chat-footer my-3 d-flex align-center justify-center">
            <div>AI Chat</div>
          </div>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '../store/index';
import { gptService } from '../global/gpt.api.service';
import { renderMermaidWithDownloads } from '../utils/mermaidDownload';
import ChatActions from './AI.ChatActions.vue';
import markdownIt from 'markdown-it';
import hljs from 'highlight.js';

const yeetAvatar = new URL('../assets/yeet.png', import.meta.url).href;

const route = useRoute();
const router = useRouter();
useAppStore();

interface RecordItem {
  Text: string;
  Data?: string;
  MimeType?: string;
}

interface ChatRecord {
  id?: string;
  Role?: { Label: string; };
  Items?: RecordItem[];
  image?: string;
  timestamp?: string;
}

const records = ref<ChatRecord[]>([]);
const isLoading = ref(true);

const conversationId = computed(() => route.query.conversationId as string ?? '');
const isAgentRecord = computed(() =>
  typeof route.query.isAgent === 'string' && route.query.isAgent.toLowerCase() === 'true'
);

const department = computed(() => route.params.department as string || '');

const filteredRecords = computed(() => {
  return records.value.filter((record) => record.Role?.Label !== 'system');
});

async function initRecords(conversation: { conversationId: string; isAgent: boolean; }) {
  isLoading.value = true;
  try {
    if (!conversation || !conversation.conversationId) {
      router.push({ name: 'no_auth' });
      return;
    }
    const chatHistory = await fetchChatHistory(conversation);
    records.value = mapRecordsWithImage(chatHistory);
    nextTick(() => renderMermaidWithDownloads('.bot-content .mermaid, .user-content .mermaid'));
  } catch (error) {
    console.error('Error fetching records:', error);
  } finally {
    isLoading.value = false;
  }
}

async function fetchChatHistory(conversation: { conversationId: string; isAgent: boolean; }): Promise<ChatRecord[]> {
  let api: any;
  if (conversation.isAgent) {
    api = await gptService.record.request({
      conversationId: conversation.conversationId,
      userId: '',
    } as any, true);
    return (api?.data?.records || []).map((record: any) => ({
      Role: { Label: record.role },
      Items: [{ Text: record.content }],
      image: '',
      timestamp: record.timestamp,
    }));
  } else {
    api = await gptService.record.request({ conversationId: conversation.conversationId });
    return api?.data?.ChatHistory || [];
  }
}

function mapRecordsWithImage(history: ChatRecord[]): ChatRecord[] {
  return (history || []).map((record) => ({
    ...record,
    image: firstImageDataUri(record?.Items),
  }));
}

function firstImageDataUri(items?: RecordItem[] | null): string {
  if (!Array.isArray(items) || items.length === 0) return '';
  const found = items.find((it) => it?.Data && it?.MimeType);
  return found ? `data:${found.MimeType};base64,${found.Data}` : '';
}

function convertMarkdown(content: string): string {
  const mermaidBlock = /^```\s*mermaid\s*\n([\s\S]*?)```/im;
  if (mermaidBlock.test(content)) {
    content = content.replace(mermaidBlock, (_match, code) => `<div class="mermaid">${code}</div>`);
  }
  const md: markdownIt = new markdownIt({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true,
    highlight(str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre><code class="hljs">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
        } catch (__) { /* ignore */ }
      }
      return `<pre><code class="hljs">${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });
  return md.render(content);
}

watch(isLoading, async (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    await nextTick();
    renderMermaidWithDownloads('.bot-content .mermaid, .user-content .mermaid');
  }
});

onMounted(async () => {
  const conversation = {
    conversationId: route.query.conversationId as string,
    isAgent:
      typeof route.query.isAgent === 'string' && route.query.isAgent.toLowerCase() === 'true',
  };
  await initRecords(conversation);
});
</script>

<style lang="scss">
.no-data-container {
  padding: 40px 20px;
  max-width: 300px;
}

.chatbox {
  width: 50%;
  min-width: 700px;
  flex: 1 1 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.chatbox::-webkit-scrollbar {
  display: none;
}

.chat-bot {
  color: var(--bot-text);
  font-style: normal;
  font-weight: 400;
  line-height: 1.75rem;
  border-radius: 20px 20px 20px 3px;
  background: var(--bot-bg);
  overflow-x: auto;

  .bot-content {
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
    box-sizing: border-box;

    ul,
    ol {
      margin-left: 20px;
    }

    hr {
      border: none;
      border-top: 2px solid var(--border-color);
      height: 0;
      margin-top: 8px;
      margin-bottom: 8px;
    }

    h1,
    h2,
    h3,
    h4 {
      margin-top: 20px;
      margin-bottom: 8px;
    }

    p {
      margin-bottom: 8px;
    }

    pre {
      overflow-x: auto;
      white-space: pre;
    }

    pre>code {
      background-color: var(--pre-bg);
      color: var(--pre-text);
      white-space: pre;
    }

    code {
      background-color: var(--code-bg);
      color: var(--code-text);
    }
  }

  table {
    border: 1px solid var(--border-color);
    border-collapse: collapse;
    border-spacing: 1px;
    text-align: left;
    word-wrap: break-word;
  }

  th {
    border: 1px solid var(--border-color);
    background-color: var(--code-bg);
    padding: 5px;
  }

  td {
    border: 1px solid var(--border-color);
    background-color: var(--bot-bg);
    padding: 5px;
  }

  img {
    width: 100%;
    border-radius: 20px;
  }
}

.chat-user {
  color: #FFF;
  font-style: normal;
  font-weight: 700;
  line-height: 1.75rem;
  border-radius: 20px 20px 3px 20px;
  background: rgb(var(--v-theme-primary));
  overflow-x: auto;

  .user-content {
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
    box-sizing: border-box;

    ul,
    ol {
      margin-left: 20px;
    }

    hr {
      border: none;
      border-top: 2px solid rgba(255, 255, 255, 0.3);
      height: 0;
      margin-top: 8px;
      margin-bottom: 8px;
    }

    h1,
    h2,
    h3,
    h4 {
      margin-top: 20px;
      margin-bottom: 8px;
    }

    p {
      margin-bottom: 8px;
    }

    pre {
      overflow-x: auto;
      white-space: pre;
    }

    pre>code {
      background-color: rgba(255, 255, 255, 0.9);
      color: #000;
      white-space: pre;
    }

    code {
      background-color: rgba(255, 255, 255, 0.3);
      color: #FFF;
    }
  }

  table {
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-collapse: collapse;
    border-spacing: 1px;
    text-align: left;
    word-wrap: break-word;
  }

  th {
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 5px;
  }

  td {
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 5px;
  }

  img {
    width: 100%;
    border-radius: 20px;
  }

  a {
    color: #FFF !important;
  }
}

.bot-content .mermaid,
.user-content .mermaid {
  display: block;
  overflow: auto;
  width: 100%;
  position: relative;
}

.bot-content .mermaid svg,
.user-content .mermaid svg {
  display: block;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
}

.mermaid-wrap {
  position: relative;
  display: inline-block;
}

.mermaid-tooltip {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #555;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  z-index: 10;

  &.is-visible {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  &:hover {
    background: rgb(var(--v-theme-surface));
    border-color: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-primary));
    box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.15);
  }
}

.mermaid-context-menu {
  background: var(--bot-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px;
  min-width: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
}

.mermaid-context-menu-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.06);
    color: rgb(var(--v-theme-primary));
  }
}

.bot-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  align-self: flex-start;
  flex-shrink: 0;
}

.user-record-row {
  .user-actions-wrap {
    flex-shrink: 0;
    align-self: center;
    margin-right: 6px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  &:hover .user-actions-wrap { opacity: 1; }
}

.chat-footer {
  width: 100%;
  color: var(--text-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;

  .policy {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
  }

  .kingston {
    color: rgb(var(--v-theme-primary));
  }
}

// Dark theme overrides — colors handled via CSS vars in main.scss
.v-theme--dark {
  .mermaid-context-menu {
    background: var(--bot-bg);
    border-color: var(--border-color);
    color: var(--bot-text);
  }

  .mermaid-context-menu-item:hover {
    background: var(--code-bg);
  }
}


.v-theme--light {

  .title-text {
    color: rgb(var(--v-theme-darkPurple)) !important;
  }

  .sub-title-text {
    color: grey;
  }
}


.v-theme--dark {
  .title-text {
    color: white !important;
  }

  .sub-title-text {
    color: white;
  }
}
</style>
