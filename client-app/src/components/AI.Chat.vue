<template>
  <div class="fill-height d-flex flex-row">

    <ChatList ref="chatListRef"
              v-model:drawer="drawer"
              :conversation="selectedConversation"
              @new-chat="newChat"
              @select-conversation="selectConversation"
              @delete-conversation="handleDeleteConversation"
              @open-prompt-manager="showPromptManager = true"
              @live-mode="$router.push('/live')" />

    <!-- Chat Interface -->
    <v-card v-if="!showPromptManager"
            flat
            class="fill-height d-flex flex-column pa-0 flex-1-1-0"
            style="min-width: 0;">
      <v-card-text class="chat-bg d-flex align-center px-4 py-1 flex-grow-0 pb-4">
        <v-app-bar-nav-icon density="compact"
                            class="bar-nav-icon"
                            @click.stop="drawer = !drawer"></v-app-bar-nav-icon>

        <div style="flex: 0 1 auto; min-width: 0;"
             class="pt-4">
          <ModelSelector ref="modelSelectorRef"
                         v-model:usedModel="usedModel"
                         :conversation="selectedConversation" />
        </div>

      </v-card-text>

      <div class="chat-bg d-flex flex-column flex-grow-1 overflow-hidden align-center"
           style="position: relative;">

        <ChatOutline @navigate="navigateToMessage" />

        <div ref="chatBox"
             class="chatbox flex-grow-1 overflow-y-auto pa-4">
          <div class="mx-auto"
               style="width: 100%;">
            <div class="d-flex flex-column align-center">
              <div class="d-flex flex-column align-center">
                <img class="chat-bg-img chat-bg-light"
                     :src="chatBg"
                     width="400"
                     alt="AI Chat" />
                <img class="chat-bg-img chat-bg-dark"
                     :src="chatBg_dark"
                     width="400"
                     alt="AI Chat" />
                <div class="chat-title my-3 gradient-text">Hi, {{ account }}</div>
                <div class="chat-subtitle">
                  Ask me anything. Start a conversation below.
                </div>
              </div>
            </div>
            <PromptCards @selected="(item: any) => input = item.prompt" />

            <div class="mx-2">
              <div v-for="(message, index) in messages"
                   :key="index"
                   :data-message-index="index">
                <div v-if="message.role == 'user'"
                     class="d-flex justify-end align-end mb-3">
                  <div class="d-flex flex-column"
                       style="min-width: 0">
                    <div class="d-flex flex-column align-end chat-user pt-2 pb-2 pr-4 pl-4">
                      <div v-if="message.content"
                           class="user-content"
                           v-html="message.content"></div>
                      <img v-if="message.image"
                           :src="message.image"
                           alt="User's Image"
                           class="mt-2"
                           style="max-width: 100%; border-radius: 12px;">
                    </div>
                    <div v-if="message.content"
                         class="d-flex justify-end mt-1">
                      <ChatActions :chatId="chatId!"
                                   :message="message"
                                   :useAgent="useAgent" />
                    </div>
                  </div>
                </div>
                <div class="d-flex mb-3"
                     v-else>
                  <img class="mr-3 bot-avatar"
                       :src="botAvatar"
                       alt="AI Chat" />
                  <div class="d-flex flex-column"
                       style="min-width: 0; flex: 1">
                    <div class="d-flex flex-column align-end chat-bot pt-2 pb-3 pr-4 pl-4">
                      <div v-if="message.content"
                           class="bot-content"
                           v-html="message.content"></div>
                      <span v-else
                            class="pulse-loader">
                        <span class="pulse-dot"></span>
                        <span class="pulse-dot"></span>
                        <span class="pulse-dot"></span>
                      </span>
                    </div>
                    <div v-if="message.content"
                         class="d-flex justify-end mt-1">
                      <ChatActions :chatId="chatId!"
                                   :message="message"
                                   :useAgent="useAgent" />
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="isError"
                   class="d-flex justify-center mt-2 mb-1">
                <v-btn variant="outlined"
                       color="red"
                       size="small"
                       :ripple="false"
                       @click="retry">
                  Retry
                </v-btn>
              </div>
            </div>
            <div v-if="isResponding" style="min-height: 60vh;"></div>
          </div>
        </div>

        <div class="d-flex flex-column align-center mt-3" style="width: 100%;">
          <div class="input-block">
            <div class="d-flex ml-2 mr-2 align-end">
              <Textarea ref="textareaRef"
                        v-model:input="input"
                        :isDisabled="isResponding || optimizing || !chatId"
                        :chatId="chatId"
                        :rows="rows"
                        :canSend="canSend"
                        @send="send"
                        @pasteImage="(image: File) => fileInput = image" />
            </div>
            <div class="d-flex ml-2 mr-2 mt-2 mb-1 align-end">

              <div class="mr-auto ml-2 mb-2 d-flex align-center ga-2">
                <v-tooltip content-class="bg-red-lighten-1"
                           location="bottom">
                  <template v-slot:activator="{ props: tooltipProps }">
                    <v-btn v-bind="tooltipProps"
                           icon
                           size="small"
                           class="functionalBtn"
                           variant="text"
                           :ripple="false"
                           @click="newChat">
                      <v-icon class="btn-icon-pink">mdi-chat-plus</v-icon>
                    </v-btn>
                  </template>
                  <span>New Chat</span>
                </v-tooltip>

                <PromptSelector @selected="selectedPrompt"
                                @edit="showPromptManager = true" />
                <ExpertSelector @selected="(item: any, autoSend: boolean) => selectedPrompt(item, autoSend)" />

                <v-tooltip content-class="bg-red-lighten-1"
                           location="bottom">
                  <template v-slot:activator="{ props: tooltipProps }">
                    <v-btn :disabled="messages.length < 2 || isResponding"
                           @click="summarize"
                           icon
                           size="small"
                           class="functionalBtn"
                           variant="text"
                           v-bind="tooltipProps"
                           :ripple="false">
                      <v-icon class="btn-icon-pink">mdi-newspaper-variant-outline</v-icon>
                    </v-btn>
                  </template>
                  <span>Conversation Summarization</span>
                </v-tooltip>

                <OptimizePromptButton v-model:optimizing="optimizing"
                                      v-model:input="input"
                                      :len="len"
                                      :isResponding="isResponding" />
              </div>

              <div class="d-flex align-center justify-end">
                <FileUploader ref="fileUploaderRef"
                              v-model:fileDataUri="fileDataUri"
                              v-model:fileInput="fileInput" />
                <MicButton ref="micButtonRef"
                           v-model="input"
                           :disabled="isResponding || optimizing"
                           :maxLen="maxLen"
                           :currentLen="len"
                           @listening-change="onListeningChange" />
                <span class="text-grey">{{ `${len}/${maxLen}` }}</span>
                <v-btn v-if="isResponding"
                       icon
                       variant="plain"
                       color="red"
                       :ripple="false"
                       style="background-color: transparent;"
                       @click="stopGeneration">
                  <v-icon>mdi-stop</v-icon>
                </v-btn>
                <v-btn v-else
                       icon
                       variant="plain"
                       color="red"
                       :ripple="false"
                       style="background-color: transparent;"
                       :disabled="!canSend || micListening"
                       @click="send">
                  <v-icon>mdi-send</v-icon>
                </v-btn>
              </div>
            </div>
          </div>

          <div class="chat-footer my-3 d-flex align-center justify-center flex-wrap">
            <AIFooter />
          </div>
        </div>
      </div>
    </v-card>

    <div v-if="showPromptManager"
         class="chat-footer d-flex flex-column align-center justify-center w-100"
         style="width: 100%;">
      <PromptManager @backToChat="showPromptManager = false" />
      <AIFooter />
    </div>

    <v-snackbar v-model="snackbar.visible"
                :color="snackbar.color"
                location="top right"
                timeout="5000">
      {{ snackbar.message }}
    </v-snackbar>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from '../store/index';
import { gptService } from '../global/gpt.api.service';
import { renderMermaidWithDownloads } from '../utils/mermaidDownload';
import { SummaryPrompt } from './prompts/SummaryPrompt';
import markdownit from 'markdown-it';
import hljs from 'highlight.js';

import ModelSelector from './AI.ModelSelector.vue';
import ChatList from './AI.ChatList.vue';
import ExpertSelector from './AI.ExpertSelector.vue';
import PromptSelector from './AI.PromptSelector.vue';
import ChatActions from './AI.ChatActions.vue';
import FileUploader from './AI.FileUploader.vue';
import OptimizePromptButton from './AI.OptimizePromptButton.vue';
import Textarea from './AI.Textarea.vue';
import PromptCards from './AI.PromptCards.vue';
import PromptManager from './AI.PromptManager.vue';
import MicButton from './AI.MicButton.vue';
import AIFooter from './AI.Footer.vue';
import ChatOutline from './AI.ChatOutline.vue';
import { useOutlineStore } from '../store/outline';

const chatBg = new URL('../assets/yeet_welcome.png', import.meta.url).href;
const chatBg_dark = new URL('../assets/yeet_welcome.png', import.meta.url).href;
const yeetClosed = new URL('../assets/yeet.png', import.meta.url).href;
const yeetOpen = new URL('../assets/yeet_mouth_open.png', import.meta.url).href;
const botAvatar = ref(yeetClosed);
let talkTimer: ReturnType<typeof setTimeout> | null = null;

function startTalking() {
  let mouthOpen = false;
  function tick() {
    mouthOpen = !mouthOpen;
    botAvatar.value = mouthOpen ? yeetOpen : yeetClosed;
    talkTimer = setTimeout(tick, 80 + Math.random() * 280);
  }
  tick();
}

function stopTalking() {
  if (talkTimer) { clearTimeout(talkTimer); talkTimer = null; }
  botAvatar.value = yeetClosed;
}

const route = useRoute();

// Refs
const chatBox = ref<HTMLElement | null>(null);
const chatListRef = ref<any>(null);
const micButtonRef = ref<any>(null);
const fileUploaderRef = ref<any>(null);
const textareaRef = ref<any>(null);

// State
const input = ref('');
const selectedConversation = ref<any>(null);
const maxRows = 5;
const maxLen = 20000;
const chatId = ref<string | null>(null);
const content = ref('');
const cancelAPI = ref(new AbortController());
const messages = ref<any[]>([]);
const isResponding = ref(false);
const fileDataUri = ref<string | null>(null);
const fileInput = ref<File | null>(null);
const optimizing = ref(false);
const usedModel = ref<{ name: string; isAgent: boolean; }>({ name: '', isAgent: false });
const previousIsAgent = ref(false);
const drawer = ref(true);
const micListening = ref(false);
const showPromptManager = ref(false);
const snackbar = ref({ visible: false, message: '', color: 'success' });
const lastPrompt = ref('');
const isError = ref(false);
const historyOffset = ref(0);
const hasMoreHistory = ref(false);
const isLoadingHistory = ref(false);

const textDecoder = new TextDecoder('utf-8');
const outlineStore = useOutlineStore();

// markdown-it instance
const md = (() => {
  const mdInstance = markdownit({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true,
    highlight(str: string, lang: string) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre><code class="hljs">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
        } catch (__) { /* ignore */ }
      }
      return `<pre><code class="hljs">${markdownit().utils.escapeHtml(str)}</code></pre>`;
    },
  });
  const fence = mdInstance.renderer.rules.fence;
  mdInstance.renderer.rules.fence = function (tokens: any, idx: number, options: any, env: any, self: any) {
    const info = (tokens[idx].info || '').trim().toLowerCase();
    if (info === 'mermaid' || info === '{mermaid}') {
      return `<div class="mermaid">${tokens[idx].content}</div>`;
    }
    return fence ? fence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };
  return mdInstance;
})();

// Computed
const account = computed(() => 'Maru Lin'); //todo: use real account info

const useAgent = computed(() => !!(usedModel.value && usedModel.value.isAgent));

const len = computed(() => (input.value ? input.value.length : 0));

const rows = computed(() => {
  if (input.value) {
    let count = (input.value.match(/\n/g) || []).length + 1;
    const wrappingCount = Math.floor(input.value.length / 30);
    count = count > wrappingCount ? count : wrappingCount;
    return count > maxRows ? maxRows : count;
  }
  return 1;
});

const canSend = computed(() => !isResponding.value && len.value > 0 && len.value <= maxLen);

// Watchers
watch(messages, () => {
  // auto-scroll disabled
});

watch(usedModel, async (newModel, oldModel) => {
  if (!oldModel || !oldModel.name) {
    await newChat();
    previousIsAgent.value = newModel?.isAgent || false;
    return;
  }
  const newIsAgent = newModel?.isAgent || false;
  const oldIsAgent = oldModel?.isAgent || false;
  if (newIsAgent !== oldIsAgent) {
    await newChat();
  }
  previousIsAgent.value = newIsAgent;
});

// Methods
function handleSnackbar({ message, color }: { message: string; color?: string; }) {
  snackbar.value = { visible: true, message, color: color || 'success' };
}

function onListeningChange(v: boolean) {
  micListening.value = v;
}

function scrollDown() {
  nextTick(() => {
    chatBox.value?.scroll({ top: chatBox.value.scrollHeight, behavior: 'smooth' });
  });
}


function navigateToMessage(index: number) {
  if (!chatBox.value) return;
  const el = chatBox.value.querySelector(`[data-message-index="${index}"]`) as HTMLElement | null;
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    outlineStore.setActiveIndex(index);
  }
}

function updateOutlineActiveIndex() {
  if (!outlineStore.visible || !chatBox.value) return;
  const box = chatBox.value;
  const mid = box.getBoundingClientRect().top + box.getBoundingClientRect().height / 2;
  const els = box.querySelectorAll('[data-message-index]');
  let active = 0;
  els.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= mid) {
      active = Number((el as HTMLElement).dataset.messageIndex ?? 0);
    }
  });
  outlineStore.setActiveIndex(active);
}

function summarize() {
  input.value = SummaryPrompt;
  send(false);
}

async function selectedPrompt(item: { prompt: string; }, autoSend = false) {
  if (autoSend) {
    await newChat();
    input.value = item.prompt;
    await send(false);
  } else {
    input.value = item.prompt;
  }
}

function toHtml(text: string): string {
  return md.render(text).replace(/<a /g, '<a target="_blank" ');
}

async function send(firstPrompt = true) {
  micButtonRef.value?.stop?.();
  const prompt = input.value.trim();
  lastPrompt.value = prompt;
  input.value = '';
  isError.value = false;
  messages.value = [...messages.value];
  if (!prompt) return;

  if (firstPrompt) {
    const userConversation: any = { role: 'user', content: toHtml(prompt) };
    if (fileDataUri.value?.startsWith('data:image')) userConversation.image = fileDataUri.value;
    messages.value.push(userConversation);
    outlineStore.appendEntry(prompt, 'user');
  }
  messages.value.push({ role: 'gpt', content: '' });
  nextTick(() => {
    if (!chatBox.value) return;
    const userBubbles = chatBox.value.querySelectorAll('.chat-user');
    if (!userBubbles.length) return;
    const lastBubble = userBubbles[userBubbles.length - 1] as HTMLElement;
    const row = lastBubble.closest('.d-flex.justify-end') as HTMLElement;
    if (row) chatBox.value.scrollTop = row.offsetTop - 16;
  });

  isResponding.value = true;

  let payload: any;
  if (useAgent.value) {
    payload = {
      AgentName: usedModel.value.name,
      ConversationId: chatId.value,
      UserId: '',
      Content: prompt,
      FileContent: fileDataUri.value,
    };
  } else {
    payload = {
      ConversationId: chatId.value,
      Content: prompt,
      File: fileDataUri.value,
      User: { Name: '' },
      Domain: '',
      Model: usedModel.value.name,
    };
  }

  gptService.send.request(payload, cancelAPI.value.signal, useAgent.value)
    .then((stream: any) => {
      const reader = stream.body.getReader();
      input.value = '';
      reader.read().then(async function pump({ done, value }: { done: boolean; value: Uint8Array; }) {
        if (done) {
          await handleChatStreamEnd();
          return '';
        } else {
          processChatStreamChunk(value);
          return reader.read().then(pump);
        }
      });
    })
    .catch((error: unknown) => {
      handleChatStreamError(error);
    });
}

async function handleChatStreamEnd() {
  const msg = messages.value[messages.value.length - 1];
  if (!msg) return;
  const rawContent = content.value;
  msg.content = toHtml(rawContent);
  msg.markdownContent = rawContent;
  if (msg.content.includes('This request has been blocked by our content filters.')) {
    msg.content = "Your request has violated the company's content policy.";
  }
  // Append assistant entry to outline after response completes
  if (rawContent) {
    outlineStore.appendEntry(rawContent, 'assistant');
  }
  isResponding.value = false;
  content.value = '';
  fileUploaderRef.value?.removeFile?.();
  nextTick(() => {
    textareaRef.value?.inputRef?.focus?.();
  });
  if (messages.value.length >= 2 && messages.value.length <= 3) {
    chatListRef.value?.initConversationList?.();
    gptService.genTopic.request({
      ConversationId: chatId.value,
      User: { Name: '' },
      ClientDevice: {
        PrimaryLanguage: navigator.language || (navigator as any).userLanguage,
        SecondaryLanguages: navigator.languages ? navigator.languages.slice(1).join(',') : '',
        TimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }).then(() => {
      chatListRef.value?.initConversationList?.();
    });
  }
}

function processChatStreamChunk(value: Uint8Array) {
  const buffer = textDecoder.decode(value, { stream: true });
  let text = '';
  if (buffer.startsWith('{ "statusCode":') || buffer.startsWith('<html>')) {
    console.error(buffer);
    text = 'An error occurred in the AI system. Please enter the conversation again or <strong>refresh the page</strong>.';
  } else {
    text = parseStreamBuffer(buffer);
  }
  if (text && !content.value) startTalking();
  content.value += text;
  const msg = messages.value[messages.value.length - 1];
  if (!msg) return;
  if (text.match(/\n/g)) msg.content = toHtml(content.value);
  else msg.content += text;
}

function parseStreamBuffer(buffer: string): string {
  let text = '';
  const events = buffer.split('\n\n');
  events.forEach((chunk) => {
    const match = chunk.trim().match(/\{.*"[ve]"\s*:\s*".*?"\s*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.v) text += parsed.v;
        if (parsed.e) console.error('Error Stream Buffer:', parsed.e);
      } catch (e) {
        console.error('Error Stream Buffer:', e);
      }
    }
  });
  return text;
}

function handleChatStreamError(error: unknown) {
  isResponding.value = false;
  isError.value = true;
  const msg = messages.value[messages.value.length - 1];
  if (msg) {
    msg.content = 'An error occurred in the AI system.';
  }
  console.error('Chat stream error:', error);
}

async function retry() {
  messages.value.pop();
  isError.value = false;
  input.value = lastPrompt.value;
  await send(false);
}

async function stopGeneration() {
  cancelAPI.value.abort();
  cancelAPI.value = new AbortController();
  await handleChatStreamEnd();
}

async function newChat() {
  chatId.value = null;
  showPromptManager.value = false;
  hasMoreHistory.value = false;
  historyOffset.value = 0;
  outlineStore.$patch({ entries: [], conversationId: null, activeIndex: 0 });
  micButtonRef.value?.stop?.();
  cancelAPI.value.abort();
  cancelAPI.value = new AbortController();
  isResponding.value = false;
  content.value = '';
  messages.value = [];
  try {
    let payload: any;
    if (useAgent.value) {
      payload = { UserId: '' };
    } else {
      payload = {
        Domain: '',
        User: { Name: '' },
        ClientDevice: {
          PrimaryLanguage: navigator.language || (navigator as any).userLanguage,
          SecondaryLanguages: navigator.languages ? navigator.languages.slice(1).join(',') : '',
          TimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };
    }
    const api = await gptService.start.request(payload, cancelAPI.value.signal, useAgent.value);
    chatId.value = api.data.conversationId;
  } catch (error) {
    console.error('Failed to start new chat:', error);
  }
}

function selectConversation(conversation: any) {
  selectedConversation.value = conversation;
  initRecords(conversation);
}

async function handleDeleteConversation(deletedConversation: any) {
  if (chatId.value === deletedConversation.conversationId) {
    await newChat();
  }
}

// ── record helpers (shared by initRecords and loadMoreHistory) ────────────────

function mapAgentRecord(record: any) {
  return {
    role: record.role,
    content: toHtml(record.content),
    markdownContent: record.content,
    image: '',
    timestamp: record.timestamp,
  };
}

function isChatMessage(record: any): boolean {
  const label = record?.Role?.Label;
  const firstItem = record?.Items?.[0];
  return (label === 'assistant' || label === 'user') && !!firstItem?.Text;
}

function toMessage(record: any) {
  const items = record?.Items ?? [];
  const firstText = items[0]?.Text ?? '';
  const imageItem = items.find((it: any) => it?.Data && it?.MimeType);
  const imageDataUri = imageItem ? `data:${imageItem.MimeType};base64,${imageItem.Data}` : '';
  return {
    role: record.Role.Label,
    content: toHtml(firstText),
    markdownContent: firstText,
    image: imageDataUri,
  };
}

// ── history loading ───────────────────────────────────────────────────────────

async function initRecords(conversation: any) {
  if (!conversation || !conversation.conversationId) return;

  const isAgent = !!conversation.isAgent;
  const conversationId = conversation.conversationId;

  if (chatId.value === conversationId) return;

  historyOffset.value = 0;
  hasMoreHistory.value = false;

  try {
    const api = await gptService.record.request(
      { conversationId, offset: 0, limit: 10 },
      isAgent,
    );
    if (isAgent && api?.data?.records) {
      messages.value = api.data.records.map(mapAgentRecord);
      chatId.value = api.data.conversationId;
      hasMoreHistory.value = false;
    } else {
      const chatHistory = api?.data?.ChatHistory ?? [];
      messages.value = chatHistory.filter(isChatMessage).map(toMessage);
      chatId.value = conversationId;
      hasMoreHistory.value = api?.data?.hasMore ?? false;
      historyOffset.value = messages.value.length;
    }
    nextTick(() => scrollDown());
    outlineStore.fetchEntries(conversationId);
  } catch (error) {
    console.error('Error fetching records:', error);
  }
}

async function loadMoreHistory() {
  if (!chatId.value || isLoadingHistory.value || !hasMoreHistory.value) return;
  isLoadingHistory.value = true;

  const box = chatBox.value;
  const prevScrollHeight = box?.scrollHeight ?? 0;

  try {
    const api = await gptService.record.request(
      { conversationId: chatId.value, offset: historyOffset.value, limit: 10 },
      false,
    );
    const older = (api?.data?.ChatHistory ?? []).filter(isChatMessage).map(toMessage);
    if (older.length > 0) {
      messages.value = [...older, ...messages.value];
      historyOffset.value += older.length;
    }
    hasMoreHistory.value = api?.data?.hasMore ?? false;

    nextTick(() => {
      if (box) box.scrollTop = box.scrollHeight - prevScrollHeight;
    });
  } catch (error) {
    console.error('Error loading more history:', error);
  } finally {
    isLoadingHistory.value = false;
  }
}

function onChatBoxScroll() {
  if (!chatBox.value) return;
  if (hasMoreHistory.value && !isLoadingHistory.value && chatBox.value.scrollTop < 150) {
    loadMoreHistory();
  }
  updateOutlineActiveIndex();
}

onMounted(async () => {
  chatBox.value?.addEventListener('scroll', onChatBoxScroll);
  const q = route.query.q as string;
  if (q) {
    input.value = q;
    await send();
  }
});

onUnmounted(() => {
  chatBox.value?.removeEventListener('scroll', onChatBoxScroll);
});

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

function bindCodeCopyButtons(querySelector: string): void {
  document.querySelectorAll(querySelector).forEach(container => {
    container.querySelectorAll<HTMLElement>('pre').forEach(pre => {
      if (pre.dataset.copyBound === 'true') return;
      pre.dataset.copyBound = 'true';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = COPY_ICON;

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = pre.querySelector('code')?.textContent ?? '';
        await navigator.clipboard.writeText(text);
        btn.innerHTML = CHECK_ICON;
        btn.classList.add('code-copy-btn--copied');
        setTimeout(() => {
          btn.innerHTML = COPY_ICON;
          btn.classList.remove('code-copy-btn--copied');
        }, 2000);
      });

      pre.appendChild(btn);
    });
  });
}

// 串流結束時渲染 mermaid + 停止說話動畫
watch(isResponding, async (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    stopTalking();
    await nextTick();
    renderMermaidWithDownloads('.bot-content .mermaid, .user-content .mermaid');
    bindCodeCopyButtons('.bot-content, .user-content');
  }
});

// 載入歷史對話時渲染 mermaid（watch messages 陣列本身被替換）
watch(messages, async () => {
  await nextTick();
  renderMermaidWithDownloads('.bot-content .mermaid, .user-content .mermaid');
  bindCodeCopyButtons('.bot-content, .user-content');
}, { flush: 'post' });
</script>

<style lang="scss">
// ============================================================
// 1. Mixins (邏輯封裝)
// ============================================================
@mixin markdown-body($is-user: false) {
  word-break: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
  box-sizing: border-box;

  ul,
  ol {
    margin-left: 20px;
  }

  p {
    margin-bottom: 8px;
  }

  img {
    width: 100%;
    border-radius: 20px;
  }

  h1,
  h2,
  h3,
  h4 {
    margin: 20px 0 8px;
  }

  hr {
    border: none;
    height: 0;
    margin: 8px 0;
    border-top: 2px solid if(sass($is-user): rgba(255, 255, 255, 0.3); else: var(--border-color));
  }

  table {
    border-collapse: collapse;
    width: auto;
    border: 1px solid if(sass($is-user): rgba(255, 255, 255, 0.3); else: var(--border-color));

    th,
    td {
      border: 1px solid if(sass($is-user): rgba(255, 255, 255, 0.3); else: var(--border-color));
      padding: 5px;
    }

    th {
      background-color: if(sass($is-user): transparent; else: var(--code-bg));
    }

    td {
      background-color: if(sass($is-user): transparent; else: var(--v-theme-surface, white));
    }
  }

  code {
    border-radius: var(--radius-sm);
    padding: 2px 5px;
    font-size: 0.875rem;
    background-color: if(sass($is-user): rgba(255, 255, 255, 0.3); else: var(--code-bg, #EEEEEE));
    color: if(sass($is-user): #FFF; else: var(--code-text, #ffffff));
  }

  pre {
    overflow-x: auto;
    white-space: pre;
    margin: 8px 0;

    >code {
      display: block;
      padding: 12px 16px;
      font-size: 0.875rem;
      background-color: if(sass($is-user): rgba(255, 255, 255, 0.9); else: var(--pre-bg, #f5f5f5));
      color: if(sass($is-user): #000000; else: var(--pre-text, #ffffff));
    }
  }

  // Mermaid 整合進 Mixin
  .mermaid {
    display: block;
    overflow-x: auto;
    width: 100%;
    position: relative;

    svg {
      display: block;
      width: auto !important;
      height: auto !important;
      max-width: none !important;
    }
  }
}

// ============================================================
// 2. Layout & Components (佈局與組件)
// ============================================================
.chatbox,
.input-block {
  width: 80%;
  min-width: 0;
  margin: 0 auto;

  @media (max-width: 960px) {
    width: 100%;
    min-width: 0;
    padding: 0 12px;
  }
}

.chatbox {
  flex: 1 1 0;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.input-block {
  border-radius: var(--radius-lg);
  background: rgba(var(--v-theme-surface)) !important;
  border: 1px solid var(--border-color, #DCDCDC);

  .v-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    background-color: rgba(var(--v-theme-inputBtn));

    &.v-btn--disabled {
      background-color: transparent !important;

      .v-btn__overlay {
        display: none;
      }

      .v-icon {
        color: var(--text-muted);
      }
    }
  }
}

.chat-bot,
.chat-user {
  font-style: normal;
  line-height: 1.65;
  max-width: 700px;
  min-width: 0;

  @media (max-width: 960px) {
    max-width: 100%;
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

.chat-bot {
  background: var(--bot-bg, #FFF);
  color: var(--bot-text, #333);
  border-radius: 3px var(--radius-md) var(--radius-md) var(--radius-md);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  min-height: 46px;
  width: fit-content;

  .bot-content {
    @include markdown-body(false);
  }

  .pulse-loader {
    margin: auto;
  }
}

.chat-user {
  background: rgb(var(--v-theme-primary));
  color: #FFF;
  font-weight: 700;
  border-radius: var(--radius-md) var(--radius-md) 3px var(--radius-md);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  min-height: 32px;

  .user-content {
    @include markdown-body(true);
  }

  a {
    color: #FFF !important;
  }
}

.chat-footer {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  font-size: 12px;
  color: var(--text-muted, #666);

  .policy,
  .kingston {
    color: rgb(var(--v-theme-primary));
    text-decoration: none;
  }
}

.chat-title {
  text-align: center;
  font-weight: 700;
  font-size: 36px;
}

.chat-subtitle {
  text-align: center;
  font-size: 14px;
  color: var(--text-muted, #666);
}

// ============================================================
// 3. UI Elements (UI 元素)
// ============================================================
.bar-nav-icon {
  color: var(--nav-icon-color, rgb(var(--v-theme-darkPurple))) !important;
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
  background: var(--surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
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
  background: var(--surface-elevated);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 4px;
  min-width: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);

  &-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    padding: 5px 10px;
    border: none;
    border-radius: var(--radius-sm);
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
}

.chat-bg-dark {
  display: none;
}

.flex-1-1-0 {
  flex: 1 1 0;
}

// Code copy button
pre {
  position: relative;

  .code-copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    color: var(--text-muted);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;

    &:hover {
      background: rgba(var(--v-theme-primary), 0.1);
      color: rgb(var(--v-theme-primary));
    }

    &--copied {
      color: rgb(var(--v-theme-success));
    }
  }

  &:hover .code-copy-btn {
    opacity: 1;
  }
}

// PulseLoader
.pulse-loader {
  display: inline-flex;
  align-items: center;
  gap: 5px;

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgb(var(--v-theme-primary));
    animation: pulse-bounce 1.4s infinite ease-in-out;

    @for $i from 1 through 3 {
      &:nth-child(#{$i}) {
        animation-delay: ($i - 1) * 0.2s;
      }
    }
  }
}

@keyframes pulse-bounce {

  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}

// ============================================================
// 4. Theme System (Component-specific dark overrides)
// ============================================================
.v-theme--dark {
  .chat-bg-light {
    display: none;
  }

  .chat-bg-dark {
    display: block;
  }

  .mermaid-context-menu-item:hover {
    background: var(--code-bg);
  }
}

.mermaid:not([data-rendered="true"]) {
  visibility: hidden;
  height: 0;
  overflow: hidden;
  position: relative;
}

.mermaid[data-rendered="error"] {
  visibility: visible;
  height: auto;
}
</style>