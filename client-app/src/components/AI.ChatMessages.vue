<template>
  <div class="chatbox-wrapper flex-grow-1">
  <div ref="chatBox"
       class="chatbox overflow-y-auto pa-4"
       @scroll="onScroll">
    <div class="mx-auto chat-content-width">

      <div class="d-flex flex-column align-center" v-if="messages.length === 0">
        <!-- <img class="chat-bg-img chat-bg-light chat-welcome-img"
             :src="chatBg"
             alt="AI Chat" /> -->
        <!-- <img class="chat-bg-img chat-bg-dark chat-welcome-img"
             :src="chatBg_dark"
             alt="AI Chat" /> -->
        <div class="chat-title my-3 gradient-text">Hi, {{ account }}</div>
        <div class="chat-subtitle">Ask me anything. Start a conversation below.</div>
      </div>

      <PromptCards v-if="messages.length === 0"
      @selected="(item: any) => emit('promptSelected', item)" />

      <div class="mx-2">
        <div v-for="(message, index) in messages"
             :key="index"
             :data-message-index="index">

          <div v-if="message.role == 'user'"
               class="d-flex justify-end align-end mb-3 user-msg-row">
            <div v-if="message.content"
                 class="user-actions-wrap">
              <ChatActions :chatId="chatId!"
                           :message="message"
                           :useAgent="useAgent" />
            </div>
            <div class="d-flex flex-column user-msg-wrap">
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
            </div>
          </div>

          <div class="d-flex mb-3"
               v-else>
            <span
              class="mr-3 bot-avatar-wrap"
              :class="{ 'is-generating': isResponding && index === messages.length - 1 }"
            >
              <img 
                class="bot-avatar"
                :src="botAvatar"
                alt="AI Chat" 
              />
            </span>
            <div class="d-flex flex-column bot-msg-wrap">
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
                 @click="emit('retry')">
            Retry
          </v-btn>
        </div>
      </div>

      <div v-if="isResponding"
           style="min-height: 60vh;"></div>
      <div v-else-if="bottomSpacerHeight > 0"
           :style="{ height: `${bottomSpacerHeight}px` }"></div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import ChatActions from './AI.ChatActions.vue';
import PromptCards from './AI.PromptCards.vue';
import { renderMermaidWithDownloads } from '../utils/mermaidDownload';
import { bindCodeCopyButtons } from '../utils/markdown';
import { useOutlineStore } from '../store/outline';

const chatBg = new URL('../assets/yeet_welcome.png', import.meta.url).href;
const chatBg_dark = new URL('../assets/yeet_welcome.png', import.meta.url).href;

const props = defineProps<{
  messages: any[];
  isResponding: boolean;
  isError: boolean;
  chatId: string | null;
  useAgent: boolean;
  botAvatar: string;
  account: string;
  hasMoreHistory: boolean;
  isLoadingHistory: boolean;
}>();

const emit = defineEmits<{
  retry: [];
  loadMoreHistory: [];
  promptSelected: [item: any];
}>();

const chatBox = ref<HTMLElement | null>(null);
const outlineStore = useOutlineStore();
const bottomSpacerHeight = ref(0);

function scrollToMessage(index: number): void {
  if (!chatBox.value) return;
  const el = chatBox.value.querySelector(`[data-message-index="${index}"]`) as HTMLElement | null;
  if (el) {
    // Use offsetTop to correctly account for the chatbox padding
    chatBox.value.scrollTop = el.offsetTop - 16;
    outlineStore.setActiveIndex(index);
  }
}

function scrollToLastUserBubble(): void {
  nextTick(() => {
    if (!chatBox.value) return;
    const userBubbles = chatBox.value.querySelectorAll('.chat-user');
    if (!userBubbles.length) return;
    const lastBubble = userBubbles[userBubbles.length - 1] as HTMLElement;
    const row = lastBubble.closest('.d-flex.justify-end') as HTMLElement;
    if (row) chatBox.value.scrollTop = row.offsetTop - 16;
  });
}

function updateOutlineActiveIndex() {
  if (!chatBox.value || outlineStore.entries.length === 0) return;
  const box = chatBox.value;
  const threshold = box.getBoundingClientRect().top + 24;
  const els = box.querySelectorAll('[data-message-index]');
  let active = 0;
  els.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top <= threshold) {
      active = Number((el as HTMLElement).dataset.messageIndex ?? 0);
    }
  });
  outlineStore.setActiveIndex(active);
}

function onScroll() {
  if (!chatBox.value) return;
  if (props.hasMoreHistory && !props.isLoadingHistory && chatBox.value.scrollTop < 150) {
    emit('loadMoreHistory');
  }
  updateOutlineActiveIndex();
}

// ── Bottom spacer (ensures last message is always scrollable to top) ──────────

async function updateBottomSpacer() {
  await nextTick();
  if (!chatBox.value || props.isResponding) {
    bottomSpacerHeight.value = 0;
    return;
  }
  const els = chatBox.value.querySelectorAll('[data-message-index]');
  if (!els.length) {
    bottomSpacerHeight.value = 0;
    return;
  }
  const lastEl = els[els.length - 1] as HTMLElement;
  const lastMsgHeight = lastEl.getBoundingClientRect().height;
  const viewportH = chatBox.value.clientHeight;
  // Space needed below the last message so it can scroll up to the threshold (24 px from top)
  bottomSpacerHeight.value = Math.max(0, viewportH - lastMsgHeight - 24);
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (chatBox.value) {
    resizeObserver = new ResizeObserver(updateBottomSpacer);
    resizeObserver.observe(chatBox.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

watch(() => props.isResponding, async (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    await nextTick();
    renderMermaidWithDownloads('.bot-content .mermaid, .user-content .mermaid');
    bindCodeCopyButtons('.bot-content, .user-content');
    updateBottomSpacer();
  }
});

watch(() => props.messages, async () => {
  await nextTick();
  renderMermaidWithDownloads('.bot-content .mermaid, .user-content .mermaid');
  bindCodeCopyButtons('.bot-content, .user-content');
  updateBottomSpacer();
}, { flush: 'post' });

defineExpose({ chatBox, scrollToMessage, scrollToLastUserBubble });
</script>

<style lang="scss">
// ============================================================
// Mixins
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
// Layout
// ============================================================
.bot-msg-wrap {
  min-width: 0;
  max-width: 85%;
}

.user-msg-wrap {
  min-width: 0;
  max-width: 80%;
}

.chat-content-width {
  width: 70%;
  min-width: 0;

  @media (max-width: 1280px) {
    width: 70%;
  }

  @media (max-width: 960px) {
    width: 100%;
  }
}

.chat-welcome-img {
  width: 400px;
  max-width: 100%;
  height: auto;
}

.chatbox-wrapper {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(to bottom, transparent, rgb(var(--v-theme-background)));
    pointer-events: none;
    z-index: 1;
  }
}

.chatbox {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: none;
  width: 100%;
  min-width: 0;
  margin: 0 auto;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 960px) {
    padding: 0 12px;
  }
}

// ============================================================
// Message bubbles
// ============================================================
.chat-bot,
.chat-user {
  font-style: normal;
  line-height: 1.65;
  max-width: 100%;
  min-width: 0;
}

@property --ring-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@keyframes rainbow-ring-spin {
  to { --ring-angle: 360deg; }
}

.bot-avatar-wrap {
  display: inline-flex;
  align-self: flex-start;
  flex-shrink: 0;
  border-radius: 50%;
  position: relative;
  width: 48px;
  height: 48px;

  &::after {
    content: '';
    position: absolute;
    inset: 7px;
    border-radius: 50%;
    background: conic-gradient(
      from var(--ring-angle),
      #ff0000, #ff7f00, #ffff00, #00e676,
      #00bfff, #7c4dff, #ff0080, #ff0000
    );
    mask: radial-gradient(circle closest-side, transparent calc(100% - 3px), black calc(100% - 3px));
    -webkit-mask: radial-gradient(circle closest-side, transparent calc(100% - 3px), black calc(100% - 3px));
    animation: rainbow-ring-spin 1.5s linear infinite;
    z-index: 2;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &.is-generating::after {
    opacity: 1;
  }
}

.bot-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  position: relative;
  z-index: 1;
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

.user-msg-row {
  .user-actions-wrap {
    flex-shrink: 0;
    align-self: center;
    margin-right: 6px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &:hover .user-actions-wrap {
    opacity: 1;
  }
}

// ============================================================
// Code copy button
// ============================================================
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

// ============================================================
// Mermaid
// ============================================================
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

// ============================================================
// Pulse loader
// ============================================================
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
// Dark theme overrides
// ============================================================
.v-theme--dark {
  .mermaid-context-menu-item:hover {
    background: var(--code-bg);
  }
}
</style>
