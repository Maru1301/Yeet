<template>
  <div class="fill-height d-flex flex-row">

    <ChatList ref="chatListRef"
              v-model:drawer="drawer"
              :isMobile="mobile"
              :conversation="selectedConversation"
              @new-chat="newChat"
              @select-conversation="selectConversation"
              @delete-conversation="handleDeleteConversation"
              @open-prompt-manager="showPromptManager = true"
              @live-mode="$router.push('/live')" />

    <!-- Chat Interface -->
    <div v-if="!showPromptManager"
         class="fill-height d-flex flex-column flex-1-1-0">
      <div class="chat-bg d-flex align-center px-4 py-1 flex-grow-0 pb-4">
        <v-app-bar-nav-icon v-if="mobile"
                            density="compact"
                            class="bar-nav-icon"
                            @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
        <div style="flex: 0 1 auto; min-width: 0;"
             class="pt-4">
          <ModelSelector v-model:usedModel="usedModel"
                         :conversation="selectedConversation" />
        </div>
      </div>

      <div class="chat-bg d-flex flex-column flex-grow-1 overflow-hidden align-center"
           style="position: relative;">

        <ChatOutline @navigate="navigateToMessage"
                     @up="handleOutlineUp"
                     @down="handleOutlineDown" />

        <ChatMessages ref="chatMessagesRef"
                      :messages="messages"
                      :isResponding="isResponding"
                      :isError="isError"
                      :chatId="chatId"
                      :useAgent="useAgent"
                      :botAvatar="botAvatar"
                      :account="account"
                      :hasMoreHistory="hasMoreHistory"
                      :isLoadingHistory="isLoadingHistory"
                      @retry="retry"
                      @load-more-history="loadMoreHistory"
                      @prompt-selected="(item) => input = item.prompt" />

        <ChatInputBar ref="chatInputBarRef"
                      v-model:input="input"
                      v-model:optimizing="optimizing"
                      v-model:fileDataUri="fileDataUri"
                      :isResponding="isResponding"
                      :chatId="chatId"
                      :messagesCount="messages.length"
                      @send="send()"
                      @new-chat="newChat"
                      @open-prompt-manager="showPromptManager = true"
                      @summarize="summarize"
                      @stop-generation="stopGeneration"
                      @prompt-selected="selectedPrompt" />
      </div>
    </div>

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
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useTheme, useDisplay } from 'vuetify';
import { gptService } from '../global/gpt.api.service';
import { SummaryPrompt } from './prompts/SummaryPrompt';
import { toHtml, mdUser, parseStreamBuffer } from '../utils/markdown';
import { deriveLabel } from '../global/outline.utils';

import ModelSelector from './AI.ModelSelector.vue';
import ChatList from './AI.ChatList.vue';
import PromptManager from './AI.PromptManager.vue';
import ChatOutline from './AI.ChatOutline.vue';
import ChatMessages from './AI.ChatMessages.vue';
import ChatInputBar from './AI.ChatInputBar.vue';
import AIFooter from './AI.Footer.vue';
import { useOutlineStore } from '../store/outline';
import yeetDarkPng from '../assets/yeet/yeet_dark.png';
import yeetLightPng from '../assets/yeet/yeet_light.png';
import yeetDarkGif from '../assets/yeet_gif/yeet_dark.gif';
import yeetLightGif from '../assets/yeet_gif/yeet_light.gif';

// ── Avatar ────────────────────────────────────────────────────────────────────

const vuetifyTheme = useTheme();
const { mobile } = useDisplay();
const isDark = computed(() => vuetifyTheme.global.name.value === 'dark');
const botAvatar = computed(() => {
  if (isResponding.value) {
    return isDark.value ? yeetLightGif : yeetDarkGif;
  }
  return isDark.value ? yeetLightPng : yeetDarkPng;
});

// ── Refs ──────────────────────────────────────────────────────────────────────

const route = useRoute();
const chatListRef = ref<any>(null);
const chatMessagesRef = ref<InstanceType<typeof ChatMessages> | null>(null);
const chatInputBarRef = ref<InstanceType<typeof ChatInputBar> | null>(null);

// ── State ─────────────────────────────────────────────────────────────────────

const input = ref('');
const selectedConversation = ref<any>(null);
const chatId = ref<string | null>(null);
const content = ref('');
const cancelAPI = ref(new AbortController());
const messages = ref<any[]>([]);
const isResponding = ref(false);
const fileDataUri = ref<string | null>(null);
const optimizing = ref(false);
const usedModel = ref<{ name: string; isAgent: boolean; }>({ name: '', isAgent: false });
const drawer = ref(false);
const showPromptManager = ref(false);
const snackbar = ref({ visible: false, message: '', color: 'success' });
const lastPrompt = ref('');
const isError = ref(false);
const historyOffset = ref(0);
const hasMoreHistory = ref(false);
const isLoadingHistory = ref(false);

const textDecoder = new TextDecoder('utf-8');
const outlineStore = useOutlineStore();

// ── Computed ──────────────────────────────────────────────────────────────────

const account = computed(() => 'Maru Lin');
const useAgent = computed(() => !!(usedModel.value && usedModel.value.isAgent));

// ── Watchers ──────────────────────────────────────────────────────────────────

watch(usedModel, async (newModel, oldModel) => {
  if (!oldModel || !oldModel.name) {
    await newChat();
    return;
  }
  if ((newModel?.isAgent || false) !== (oldModel?.isAgent || false)) {
    await newChat();
  }
});


// ── Outline navigation ────────────────────────────────────────────────────────

function navigateToMessage(index: number) {
  chatMessagesRef.value?.scrollToMessage(index);
}

function handleOutlineUp() {
  if (outlineStore.activeIndex > 0) {
    navigateToMessage(outlineStore.activeIndex - 1);
  }
}

function handleOutlineDown() {
  if (outlineStore.activeIndex < outlineStore.entries.length - 1) {
    navigateToMessage(outlineStore.activeIndex + 1);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildOutlineEntries(msgs: any[]) {
  return msgs.map((m, idx) => ({
    index: idx,
    role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
    label: deriveLabel(m.markdownContent ?? ''),
  }));
}

function summarize() {
  input.value = SummaryPrompt;
  send(false);
}

async function selectedPrompt(prompt: string, autoSend = false) {
  if (autoSend) {
    await newChat();
    input.value = prompt;
    await send(false);
  } else {
    input.value = prompt;
  }
}

// ── Streaming ─────────────────────────────────────────────────────────────────

async function send(firstPrompt = true) {
  chatInputBarRef.value?.stopMic?.();
  const prompt = input.value.trim();
  lastPrompt.value = prompt;
  input.value = '';
  isError.value = false;
  messages.value = [...messages.value];
  if (!prompt) return;

  if (firstPrompt) {
    const userConversation: any = { role: 'user', content: toHtml(prompt, mdUser), markdownContent: prompt };
    if (fileDataUri.value?.startsWith('data:image')) userConversation.image = fileDataUri.value;
    messages.value.push(userConversation);
    outlineStore.appendEntry(prompt, 'user');
  }
  messages.value.push({ role: 'gpt', content: '', markdownContent: '' });
  chatMessagesRef.value?.scrollToLastUserBubble();

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
  if (rawContent) {
    outlineStore.appendEntry(rawContent, 'assistant');
  }
  isResponding.value = false;
  content.value = '';
  chatInputBarRef.value?.removeFile?.();
  chatInputBarRef.value?.focusInput?.();
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
  content.value += text;
  const msg = messages.value[messages.value.length - 1];
  if (!msg) return;
  if (text.match(/\n/g)) msg.content = toHtml(content.value);
  else msg.content += text;
}

function handleChatStreamError(error: unknown) {
  isResponding.value = false;
  isError.value = true;
  const msg = messages.value[messages.value.length - 1];
  if (msg) msg.content = 'An error occurred in the AI system.';
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

// ── Conversation management ───────────────────────────────────────────────────

async function newChat() {
  chatId.value = null;
  showPromptManager.value = false;
  hasMoreHistory.value = false;
  historyOffset.value = 0;
  outlineStore.$patch({ entries: [], conversationId: null, activeIndex: 0 });
  chatInputBarRef.value?.stopMic?.();
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

// ── Record helpers ────────────────────────────────────────────────────────────

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
    content: record.Role.Label === 'user' ? toHtml(firstText, mdUser) : toHtml(firstText),
    markdownContent: firstText,
    image: imageDataUri,
  };
}

// ── History loading ───────────────────────────────────────────────────────────

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

    // Build outline entries from local message indices (fixes global/local index mismatch)
    outlineStore.$patch({
      conversationId,
      entries: buildOutlineEntries(messages.value),
      activeIndex: messages.value.length - 1,
    });

    await nextTick();
    navigateToMessage(messages.value.length - 1);
  } catch (error) {
    console.error('Error fetching records:', error);
  }
}

async function loadMoreHistory() {
  if (!chatId.value || isLoadingHistory.value || !hasMoreHistory.value) return;
  isLoadingHistory.value = true;

  const box = chatMessagesRef.value?.chatBox;
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
      // Rebuild outline entries to keep local indices in sync
      outlineStore.$patch({ entries: buildOutlineEntries(messages.value) });
    }
    hasMoreHistory.value = api?.data?.hasMore ?? false;

    if (box) box.scrollTop = box.scrollHeight - prevScrollHeight;
  } catch (error) {
    console.error('Error loading more history:', error);
  } finally {
    isLoadingHistory.value = false;
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  const q = route.query.q as string;
  if (q) {
    input.value = q;
    await send();
  }
});
</script>

<style lang="scss">
.bar-nav-icon {
  color: var(--nav-icon-color, rgb(var(--v-theme-darkPurple))) !important;
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

.chat-bg-dark {
  display: none;
}

.flex-1-1-0 {
  flex: 1 1 0;
}

.v-theme--dark {
  .chat-bg-light {
    display: none;
  }

  .chat-bg-dark {
    display: block;
  }
}
</style>
