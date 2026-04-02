<template>
  <v-menu :min-width="0"
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
            <span class="title-text">AI Chat</span>
            <span class="gradient-text text-uppercase">
              {{ department ? department : "Workspace" }}
            </span>
          </v-list-item-title>

          <v-list-item-subtitle class="d-flex subtitleGPT opacity-100">
            <span class="text-red-darken-2 font-weight-medium">
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
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(75, 0, 130, 0.15);
  overflow: hidden;
  border: 1px solid rgba(75, 0, 130, 0.1);
  width: max-content;
}

.model-list-item {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(75, 0, 130, 0.08) 0%, rgba(97, 0, 255, 0.05) 100%);
    transform: translateX(4px);
    border-left: 3px solid #4B0082;
    box-shadow: inset 0 0 0 1px rgba(75, 0, 130, 0.1);
  }

  &.selected-model {
    background: linear-gradient(135deg, rgba(75, 0, 130, 0.12) 0%, rgba(97, 0, 255, 0.08) 100%);
    border-left: 4px solid #4B0082;

    .model-title {
      color: #4B0082;
      font-weight: 600;
    }

    .v-theme--dark & .model-title {
      color: #b042ff;
    }
  }
}

.model-title {
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
  transition: color 0.3s ease;
}

.v-theme--dark {
  .model-title {
    color: #6f9ecd;
  }
}

.v-menu__content {
  animation: slideDown 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

// Light theme
.model-icon {
  color: #757575;
}

.model-icon.is-selected {
  color: #673AB7;
}

// Dark theme
.v-theme--dark .model-icon {
  color: #BDBDBD;
}

.v-theme--dark .model-icon.is-selected {
  color: #CE93D8;
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
