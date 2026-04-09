<template>
  <v-menu :min-width="0"
          max-height="300px"
          transition="slide-y-transition"
          location="bottom end"
          origin="top end">
    <template v-slot:activator="{ props: menuProps }">
      <v-list v-bind="menuProps"
              class="pa-0 bg-transparent"
              rounded="lg"
              pointer>
        <v-list-item link>
          <v-list-item-title class="text-h5 font-weight-bold copilot-title">
            <span class="title-text">AI Chat </span>
            <span class="gradient-text text-uppercase">
              {{ department ? department : "Workspace" }}
            </span>
          </v-list-item-title>

          <v-list-item-subtitle class="d-flex subtitleGPT opacity-100">
            <span class="text-primary font-weight-medium">
              {{ usedModel.displayName || usedModel.name }}
            </span>
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-icon>mdi-menu-down</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </template>

    <v-list nav
            density="compact"
            class="model-selector-list mt-2 me-4"
            elevation="8">
      <v-list-item v-for="(model, index) in models"
                   :key="index"
                   @click="selectModel(model)"
                   class="model-list-item"
                   :class="{ 'selected-model': model.name === usedModel.name }">
        <template v-slot:prepend>
          <v-icon class="mr-3 model-icon"
                  :class="{ 'is-selected': model.name === usedModel.name }">
            {{ model.isAgent ? 'mdi-robot' : 'mdi-brain' }}
          </v-icon>
        </template>

        <v-list-item-title class="model-title">
          {{ model.displayName || model.name }}
        </v-list-item-title>

        <template v-slot:append>
          <v-icon v-if="model.name === usedModel.name"
                  class="check-icon">
            mdi-check
          </v-icon>
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { gptService } from '../global/gpt.api.service';

interface Model {
  name: string;
  displayName?: string;
  isAgent?: boolean;
}

interface Conversation {
  isAgent?: boolean;
  modelName?: string;
}

const props = defineProps<{
  conversation: Conversation | null;
  usedModel: Model;
  department?: string;
}>();

const emit = defineEmits<{
  (e: 'update:usedModel', value: Model): void;
}>();

const models = ref<Model[]>([]);

async function initModels() {
  const api = await gptService.models.request({});
  models.value = (api as any).data;
  // Default to first model
  if (models.value.length > 0) {
    emit('update:usedModel', { ...models.value[0] });
  }
}

function selectModel(model: Model) {
  emit('update:usedModel', { ...model });
}

function selectModelByConversation(conversation: Conversation | null) {
  if (!conversation || !Array.isArray(models.value)) return;
  let match: Model | undefined;
  if (conversation.isAgent) {
    match = models.value.find(m => m.isAgent && (!conversation.modelName || m.name === conversation.modelName));
  } else {
    match = models.value.find(m => !m.isAgent && (!conversation.modelName || m.name === conversation.modelName));
  }
  if (match) {
    emit('update:usedModel', { ...match });
  }
}

onMounted(async () => {
  await initModels();
  // If conversation is set at init time, auto-select the model
  if (props.conversation) {
    selectModelByConversation(props.conversation);
  }
});

watch(() => props.conversation, (newVal) => {
  selectModelByConversation(newVal);
}, { immediate: true });
</script>

<style lang="scss">
.subtitleGPT {
  letter-spacing: 1px;
}

.copilot-title {
  font-size: 24px;
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

.model-selector-list {
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(var(--v-theme-primary), 0.12);
  overflow: hidden;
  border: 1px solid var(--border-color);
  width: max-content;
}

.model-list-item {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(var(--v-theme-primary), 0.06);
    transform: translateX(4px);
    border-left: 3px solid rgb(var(--v-theme-primary));
    box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.08);
  }

  &.selected-model {
    background: rgba(var(--v-theme-primary), 0.08);
    border-left: 4px solid rgb(var(--v-theme-primary));

    .model-title {
      color: rgb(var(--v-theme-primary));
      font-weight: 600;
    }
  }
}

.model-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--bot-text);
  transition: color 0.3s ease;
}

.v-menu__content {
  animation: slideDown 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.model-icon {
  color: var(--text-muted);
}

.model-icon.is-selected {
  color: rgb(var(--v-theme-primary));
}


@keyframes slideDown {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
