<template>
  <div class="d-flex ga-2">
    <v-tooltip v-model="showShareInfo"
               :open-on-hover="false"
               location="bottom">
      <template v-slot:activator="{ props: tooltipProps }">
        <v-btn v-bind="tooltipProps"
               icon
               density="compact"
               variant="flat"
               @click="copyFullPath(chatId)">
          <v-icon class="action-icon"
                  size="default">mdi-share-variant</v-icon>
        </v-btn>
      </template>
      <span>Link Copied</span>
    </v-tooltip>

    <v-tooltip v-model="showCopyInfo"
               :open-on-hover="false"
               location="bottom">
      <template v-slot:activator="{ props: tooltipProps }">
        <v-btn v-bind="tooltipProps"
               icon
               density="compact"
               variant="flat"
               @click="copyContent(message.markdownContent)">
          <v-icon class="action-icon">mdi-content-copy</v-icon>
        </v-btn>
      </template>
      <span>Content Copied</span>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  chatId: string;
  department?: string;
  message: { markdownContent: string; };
  useAgent?: boolean;
}>();

const showShareInfo = ref(false);
const showCopyInfo = ref(false);

function getFullPath(conversationId: string): string {
  const baseUrl = window.location.origin;
  const page = props.department ? `record/${props.department}` : 'record';
  const routePath = `${ROOT_FOLDER}/${page}?conversationId=${conversationId}&isAgent=${props.useAgent ?? false}`;
  return `${baseUrl}${routePath}`;
}

async function copyFullPath(chatId: string): Promise<void> {
  const fullPath = getFullPath(chatId);
  await navigator.clipboard.writeText(fullPath);
  showShareInfo.value = true;
  setTimeout(() => {
    showShareInfo.value = false;
  }, 1000);
}

async function copyContent(content: string): Promise<void> {
  await navigator.clipboard.writeText(content);
  showCopyInfo.value = true;
  setTimeout(() => {
    showCopyInfo.value = false;
  }, 1000);
}
</script>

<style lang="scss">
.v-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  background-color: transparent;
}

.action-icon {
  color: var(--text-muted);
  transition: color 0.15s ease;

  &:hover {
    color: rgb(var(--v-theme-primary));
  }
}
</style>
