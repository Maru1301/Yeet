<template>
  <v-navigation-drawer :model-value="isMobile ? drawerValue : true"
                       :rail="!isMobile && !drawerValue"
                       :rail-width="56"
                       width="300"
                       class="pt-3 left-menu sideBar elevation-0"
                       :permanent="!isMobile"
                       :temporary="isMobile"
                       :mobile-breakpoint="0"
                       @update:model-value="(val: boolean) => { if (isMobile) drawerValue = val; }">
    <!-- Header: logo-toggle (always visible) + theme switch (expanded only) -->
    <div class="drawer-header"
         :class="{ 'is-rail': !isMobile && !drawerValue }">
      <div class="logo-toggle"
           @click="drawerValue = !drawerValue">
        <img class="chat-bg-img chat-bg-light logo-img"
             :src="aiMenuLogo"
             alt="AI_Menu" />
        <img class="chat-bg-img chat-bg-dark logo-img"
             :src="aiMenuLogoDark"
             alt="AI_Menu" />
        <span class="nav-icon-wrap">
          <v-icon class="primary-btn"
                  size="20">mdi-menu</v-icon>
        </span>
      </div>
      <template v-if="textVisible">
        <v-spacer />
        <div class="theme-switch"
             @click.stop="toggleTheme()">
          <div class="switch-sun">
            <v-icon size="15"
                    class="switch-icon switch-icon-sun">mdi-white-balance-sunny</v-icon>
          </div>
          <div class="switch-moon">
            <v-icon size="15"
                    class="switch-icon switch-icon-moon">mdi-moon-waning-crescent</v-icon>
          </div>
        </div>
      </template>
    </div>

    <!-- Action Buttons -->
    <v-list nav
            class="pa-0">
      <v-tooltip location="right"
                 :disabled="drawerValue"
                 text="New Chat">
        <template #activator="{ props: tip }">
          <v-list-item v-bind="tip"
                       class="text-capitalize font-weight-medium"
                       min-height="56"
                       @click="handleNewChat">
            <template #prepend>
              <v-icon class="primary-btn">mdi-chat-plus</v-icon>
            </template>
            <span class="btn-text">New Chat</span>
          </v-list-item>
        </template>
      </v-tooltip>

      <v-tooltip location="right"
                 :disabled="drawerValue"
                 text="My Prompts">
        <template #activator="{ props: tip }">
          <v-list-item v-bind="tip"
                       class="text-capitalize font-weight-medium"
                       min-height="56"
                       @click="handleOpenPromptManager">
            <template #prepend>
              <v-icon class="primary-btn">mdi-bookmark</v-icon>
            </template>
            <span class="btn-text">My Prompts</span>
          </v-list-item>
        </template>
      </v-tooltip>

      <v-tooltip location="right"
                 :disabled="drawerValue"
                 text="Live">
        <template #activator="{ props: tip }">
          <v-list-item v-bind="tip"
                       class="text-capitalize font-weight-medium"
                       min-height="56"
                       @click="handleLiveMode">
            <template #prepend>
              <v-icon class="primary-btn">mdi-microphone</v-icon>
            </template>
            <span class="btn-text">Live</span>
          </v-list-item>
        </template>
      </v-tooltip>
    </v-list>

    <v-divider v-show="textVisible"
               class="mt-4"
               gradient />

    <!-- Chat List -->
    <div v-if="drawerValue"
         class="chat-list-scroll ml-1">
      <div v-if="conversationList.length > 0">
        <div v-for="group in groupedConversations"
             :key="group.dateLabel">
          <v-list density="compact">
            <v-list-subheader class="font-weight-medium text-subtitle-1 my-3"
                              color="darkPrimary">
              {{ group.dateLabel }}
            </v-list-subheader>
            <v-list-item v-for="conversation in group.conversations"
                         :key="conversation.conversationId"
                         @click="handleSelectConversation(conversation)"
                         @mouseenter="hoveredIndex = conversation.conversationId">
              <v-list-item-title class="text-truncate font-weight-regular d-flex align-center gap-1">
                <v-icon v-if="conversation.isLive"
                        size="13"
                        color="primary"
                        class="mr-1">mdi-microphone</v-icon>
                {{ conversation.topic || 'New Conversation' }}
              </v-list-item-title>
              <template #append>
                <span class="mx-1"
                      style="font-size:14px;">{{ formatTime(conversation.createdAt) }}</span>
                <v-menu rounded="xl"
                        v-if="hoveredIndex === conversation.conversationId"
                        :close-on-content-click="false"
                        location="end"
                        origin="start">
                  <template v-slot:activator="{ props: menuProps }">
                    <v-btn icon
                           variant="flat"
                           color="transparent"
                           style="width: 28px; height: 28px; min-width: 28px;"
                           v-bind="menuProps">
                      <v-icon size="24"
                              color="darkPrimary">mdi-dots-horizontal</v-icon>
                    </v-btn>
                  </template>
                  <v-card class="ms-7"
                          style="width:90px;border-radius:15px;box-shadow:0 6px 12px 0 rgba(0,0,0,0.10);">
                    <v-list density="compact"
                            class="pa-1">
                      <v-list-item class="menu-item px-2 py-0"
                                   min-height="32"
                                   @click="handleShareConversation(conversation)">
                        <template #prepend>
                          <v-icon size="16"
                                  class="mr-1">mdi-share-variant</v-icon>
                        </template>
                        <v-list-item-title style="font-size:13px;">Share</v-list-item-title>
                      </v-list-item>
                      <v-list-item class="menu-item text-primary px-2 py-0"
                                   min-height="32"
                                   @click="handleDeleteConversation(conversation)">
                        <template #prepend>
                          <v-icon size="16"
                                  class="mr-1">mdi-delete</v-icon>
                        </template>
                        <v-list-item-title style="font-size:13px;">Delete</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-card>
                </v-menu>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </div>
      <v-list density="compact"
              v-else>
        <v-list-item>
          <v-list-item-title class="text-center text-grey">
            No conversations yet
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </div>

    <!-- Theme toggle at bottom (rail only, desktop) -->
    <div v-show="!isMobile && !drawerValue"
         class="rail-theme-bottom">
      <v-tooltip location="right"
                 text="Toggle theme">
        <template #activator="{ props: tip }">
          <v-btn v-bind="tip"
                 icon
                 variant="text"
                 size="small"
                 @click="toggleTheme()">
            <v-icon class="primary-btn">mdi-theme-light-dark</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog"
              max-width="500"
              persistent>
      <v-card class="pa-4"
              style="border-radius: 12px;">
        <v-card-title class="text-h6 font-weight-bold pa-0 mb-3">
          Delete Chat ?
        </v-card-title>
        <v-card-text class="pa-0 mb-4 text-grey-darken-1">
          This will delete "{{ selectedConversation?.topic || 'New Conversation' }}" ({{
            formatDeleteTime(selectedConversation?.createdAt) }})
        </v-card-text>
        <v-card-actions class="pa-0 justify-end">
          <v-btn variant="text"
                 class="text-capitalize mr-2"
                 min-width="80px"
                 @click="deleteDialog = false">
            CANCEL
          </v-btn>
          <v-btn variant="text"
                 class="text-capitalize"
                 min-width="80px"
                 color="error"
                 @click="confirmDelete">
            DELETE
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useTheme } from 'vuetify';
import { useAppStore } from '../store/index';
import { gptService } from '../global/gpt.api.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const aiMenuLogo = new URL('../assets/yeet_pic/yeet_dark.png', import.meta.url).href;
const aiMenuLogoDark = new URL('../assets/yeet_pic/yeet_light.png', import.meta.url).href;

const props = defineProps<{
  drawer: boolean;
  isMobile: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:drawer', val: boolean): void;
  (e: 'new-chat'): void;
  (e: 'open-prompt-manager'): void;
  (e: 'live-mode'): void;
  (e: 'select-conversation', conversation: any): void;
  (e: 'delete-conversation', conversation: any): void;
}>();

const store = useAppStore();
const vuetifyTheme = useTheme();

function toggleTheme() {
  vuetifyTheme.change(vuetifyTheme.global.name.value === 'light' ? 'dark' : 'light');
}

interface Conversation {
  conversationId: string;
  topic?: string;
  createdAt: string;
  isAgent?: boolean;
  isLive?: boolean;
}

interface ConversationGroup {
  dateLabel: string;
  conversations: Conversation[];
  sortOrder: number;
}

const hoveredIndex = ref<string | null>(null);
const conversationList = ref<Conversation[]>([]);
const deleteDialog = ref(false);
const selectedConversation = ref<Conversation | null>(null);

// Controls logo row / divider visibility. Text spans use CSS transitions instead.
const textVisible = ref(props.drawer);

const drawerValue = computed({
  get() {
    return props.drawer;
  },
  set(value: boolean) {
    emit('update:drawer', value);
  },
});

watch(drawerValue, (expanded) => {
  // On mobile: drawer open = show text. On desktop: expanded = show text, rail = hide text.
  textVisible.value = expanded;
});

const groupedConversations = computed<ConversationGroup[]>(() => {
  if (!conversationList.value || conversationList.value.length === 0) {
    return [];
  }

  const groups: Record<string, ConversationGroup> = {};
  const today = dayjs().startOf('day');
  const yesterday = dayjs().subtract(1, 'day').startOf('day');

  conversationList.value.forEach((conversation) => {
    const conversationMoment = dayjs.utc(conversation.createdAt).local();
    const conversationDay = conversationMoment.startOf('day');

    let dateLabel: string;
    if (conversationDay.isSame(today)) {
      dateLabel = 'Today';
    } else if (conversationDay.isSame(yesterday)) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = conversationMoment.format('MM/DD');
    }

    if (!groups[dateLabel]) {
      groups[dateLabel] = {
        dateLabel,
        conversations: [],
        sortOrder: conversationDay.valueOf(),
      };
    }
    groups[dateLabel].conversations.push(conversation);
  });

  Object.values(groups).forEach((group) => {
    group.conversations.sort(
      (a, b) => dayjs.utc(b.createdAt).valueOf() - dayjs.utc(a.createdAt).valueOf()
    );
  });

  return Object.values(groups).sort((a, b) => b.sortOrder - a.sortOrder);
});

async function initConversationList(): Promise<void> {
  try {
    const response = await gptService.conversationList.request({
      User: '',
    });
    if (response.data) {
      conversationList.value = response.data;
    }
  } catch {
    conversationList.value = [];
  }
}

function formatTime(utcTime: string | undefined): string {
  if (!utcTime) return '';
  const conversationMoment = dayjs.utc(utcTime).local();
  return `(${conversationMoment.format('HH:mm')})`;
}

function formatDeleteTime(utcTime: string | undefined): string {
  if (!utcTime) return '';
  const conversationMoment = dayjs.utc(utcTime).local();
  const today = dayjs().startOf('day');
  const yesterday = dayjs().subtract(1, 'day').startOf('day');
  const conversationDay = conversationMoment.startOf('day');

  if (conversationDay.isSame(today)) {
    return `Today ${conversationMoment.format('HH:mm')}`;
  } else if (conversationDay.isSame(yesterday)) {
    return `Yesterday ${conversationMoment.format('HH:mm')}`;
  } else {
    return conversationMoment.format('MM/DD HH:mm');
  }
}

function handleNewChat(): void {
  emit('new-chat');
}

function handleOpenPromptManager(): void {
  emit('open-prompt-manager');
}

function handleLiveMode(): void {
  emit('live-mode');
}

function handleSelectConversation(conversation: Conversation): void {
  emit('select-conversation', conversation);
}

async function handleShareConversation(conversation: Conversation): Promise<void> {
  const fullPath = getFullPath(conversation);
  await navigator.clipboard.writeText(fullPath);
  hoveredIndex.value = null;
}

function getFullPath(conversation: Conversation): string {
  const baseUrl = window.location.origin;
  const page = 'record';
  const isAgent = conversation.isAgent;
  const routePath = `${ROOT_FOLDER || ''}/${page}?conversationId=${conversation.conversationId}&isAgent=${isAgent}`;
  return `${baseUrl}${routePath}`;
}

async function handleDeleteConversation(conversation: Conversation): Promise<void> {
  selectedConversation.value = conversation;
  deleteDialog.value = true;
  hoveredIndex.value = null;
}

async function confirmDelete(): Promise<void> {
  if (!selectedConversation.value) return;

  try {
    await gptService.deleteRecord.request({
      conversationId: selectedConversation.value.conversationId,
      user: '',
    });

    conversationList.value = conversationList.value.filter(
      (c) => c.conversationId !== selectedConversation.value!.conversationId
    );

    emit('delete-conversation', selectedConversation.value);

    deleteDialog.value = false;
    selectedConversation.value = null;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    deleteDialog.value = false;
  }
}

onMounted(async () => {
  await initConversationList();
});

defineExpose({ initConversationList });
</script>

<style lang="scss">
.left-menu {
  scrollbar-width: none;
  -ms-overflow-style: none;
  overflow: -moz-scrollbars-none;
}

.left-menu .v-navigation-drawer__border {
  display: none !important;
}

.left-menu::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}

// Keep action-button icons at a fixed x position and consistent height in both
// expanded and rail modes. Vuetify's rail mode resets padding/justify; this overrides that.
.left-menu .v-list--nav .v-list-item {
  padding-inline-start: 16px !important;
  justify-content: flex-start !important;
  // min-height: 44px !important;
}

// Button labels: fade in during expand, disappear instantly on collapse.
// Driven by Vuetify's .v-navigation-drawer--rail class which is toggled immediately.
.left-menu .btn-text {
  white-space: nowrap;
  overflow: hidden;
  opacity: 1;
  transition: opacity 160ms ease 80ms; // start fading in 80ms into the expand
}

.left-menu.v-navigation-drawer--rail .btn-text {
  opacity: 0;
  transition: none; // collapse: hide instantly, no animation
}

// Pin the rail-only theme toggle to the bottom of the flex column.
.rail-theme-bottom {
  margin-top: auto;
  display: flex;
  justify-content: center;
  padding-bottom: 16px;
}

.left-menu .v-navigation-drawer__content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.left-menu .v-navigation-drawer__content::-webkit-scrollbar {
  display: none;
}

.v-theme--light .menu-item {
  color: rgb(var(--v-theme-darkPrimary));
}

.menu-item {
  border-radius: 8px !important;
}

.menu-item .v-list-item__prepend {
  width: auto !important;
  margin-inline-end: 4px !important;

  .v-list-item__spacer {
    width: 0 !important;
  }
}

.chat-list-scroll {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-list-scroll::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}

// Navigation drawer background
.left-menu {
  background: rgba(var(--v-theme-sideBar), 0.2) !important;

  &.v-theme--dark {
    background: rgba(var(--v-theme-sideBar)) !important;
  }
}

.btn-text {
  color: rgb(var(-v-theme-darkPurple)) !important;
}

.primary-btn {
  color: rgba(var(--v-theme-darkPrimary)) !important;
  opacity: 1 !important;
}

// Theme toggle switch
.theme-switch {
  display: flex;
  align-items: center;
  width: 58px;
  height: 28px;
  border-radius: 14px;
  padding: 0;
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background 0.3s ease;
  overflow: hidden;

  .switch-sun,
  .switch-moon {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease;
  }

  .switch-sun {
    background: rgb(var(--v-theme-primary));
  }

  .switch-moon {
    background: rgba(var(--v-theme-sideBar), 0.5);
  }
}

.switch-icon {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.v-theme--dark {
  .btn-text {
    color: white;
  }

  .theme-switch {
    background: rgb(var(--v-theme-sideBar));

    .switch-sun {
      background: rgb(var(--v-theme-background));
    }

    .switch-moon {
      background: rgb(var(--v-theme-primary));
    }
  }
}

// ── Drawer header ─────────────────────────────────────────────────────────────
.drawer-header {
  display: flex;
  align-items: center;
  padding: 12px;

  &.is-rail {
    justify-content: center;
    padding: 12px 0;
  }
}

.logo-toggle {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;

  .logo-img {
    position: absolute;
    inset: 0;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: cover;
    transition: opacity 0.2s ease;
    opacity: 1;
  }

  .nav-icon-wrap {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  &:hover .logo-img {
    opacity: 0;
  }

  &:hover .nav-icon-wrap {
    opacity: 1;
  }
}
</style>