<template>
  <v-menu v-model="showPlugins"
          :disabled="!showPlugins"
          location="top"
          max-width="480"
          rounded="lg">
    <template v-slot:activator="{ props: menuProps }">
      <v-textarea autofocus
                  v-bind="menuProps"
                  ref="inputRef"
                  v-model="localInput"
                  class="input-box"
                  no-resize
                  hide-details
                  variant="solo"
                  flat
                  :disabled="isDisabled"
                  :placeholder="isFocused ? '' : 'Send a message.'"
                  @focus="isFocused = true"
                  @blur="isFocused = false"
                  clearable
                  clear-icon="mdi-close"
                  :rows="rows"
                  @keydown="keydown"
                  @paste="onPaste"></v-textarea>
    </template>

    <v-list rounded>
      <v-list-item value="@image"
                   :active="selectedPlugin === '@image'"
                   @click="selectPlugin('@image')"
                   link>
        <template #prepend>
          <v-avatar class="bg-blue mr-3">
            <v-icon color="white">mdi-image-area</v-icon>
          </v-avatar>
        </template>
        <v-list-item-title><b>@image</b></v-list-item-title>
        <v-list-item-subtitle>Using the <b>@image</b> tag, GPT can help you generate AI
          images.</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  input: string;
  isDisabled?: boolean;
  rows?: number;
  chatId?: string | null;
  canSend?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:input', val: string): void;
  (e: 'send'): void;
  (e: 'pasteImage', file: File): void;
}>();

const localInput = ref(props.input);
const selectedPlugin = ref('');
const plugins = ['@image'];
const showPlugins = ref(false);
const inputRef = ref<any>(null);
const isFocused = ref<boolean>(false);

const labelText = computed(() => {
  if (!props.chatId) {
    return 'Initializing conversation, please wait...';
  }
  if (props.isDisabled) {
    return 'AI is processing, please wait a moment...';
  }
  return 'Send a message.';
});

watch(() => props.input, (val) => {
  localInput.value = val;
});

watch(localInput, (val) => {
  emit('update:input', val);
  if (!val) {
    selectedPlugin.value = '';
    showPlugins.value = false;
    return;
  }
  selectedPlugin.value = getBestMatchedPlugin(val);
  const matchType = getPluginMatchType(val);
  showPlugins.value = matchType === 'at' || matchType === 'prefix';
});

function getBestMatchedPlugin(val: string): string {
  if (!val) return '';
  const lowerVal = val.toLowerCase();
  let best: string | null = null;
  let maxLen = 0;
  for (const plugin of plugins) {
    const lowerPlugin = plugin.toLowerCase();
    if (lowerPlugin.startsWith(lowerVal) && lowerVal.length < plugin.length && lowerVal.length > maxLen) {
      best = plugin;
      maxLen = lowerVal.length;
    }
  }
  return best || '';
}

function getPluginMatchType(val: string): string {
  if (!val) return 'none';
  const lowerVal = val.toLowerCase();
  if (lowerVal === '@') return 'at';
  if (plugins.some(plugin => lowerVal === plugin.toLowerCase())) return 'exact';
  if (plugins.some(plugin => plugin.toLowerCase().startsWith(lowerVal) && lowerVal.length < plugin.length)) return 'prefix';
  return 'none';
}

function keydown(e: KeyboardEvent) {
  if (!localInput.value) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    const val = localInput.value;
    const matchType = getPluginMatchType(val);

    if (matchType === 'at' || matchType === 'prefix') {
      localInput.value = `${getBestMatchedPlugin(val)} `;
      e.preventDefault();
    } else if (matchType === 'exact' || matchType === 'none') {
      if (props.canSend) {
        emit('send');
      } else {
        e.preventDefault();
      }
    }
  }
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) {
        emit('pasteImage', file);
        e.preventDefault();
        break;
      }
    }
  }
}

function selectPlugin(plugin: string) {
  localInput.value = `${plugin} `;
}

defineExpose({ inputRef });
</script>

<style scoped lang="scss">
.input-box :deep(.v-field) {
  background: rgba(var(--v-theme-surface)) !important;
  border-radius: 20px;
}

.input-box :deep(.v-text-field__details) {
  display: none;
}

.input-box :deep(textarea) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.input-box :deep(textarea)::-webkit-scrollbar {
  display: none;
}

.input-box :deep(.v-field--focused .v-field__clearable .v-icon) {
  color: #eb0428 !important;
}
</style>
