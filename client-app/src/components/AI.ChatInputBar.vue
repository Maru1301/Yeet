<template>
  <div class="d-flex flex-column align-center mt-3"
       style="width: 70%;">
    <div class="input-block">
      <div class="d-flex ml-2 mr-2 align-end">
        <Textarea ref="textareaRef"
                  v-model:input="inputProxy"
                  :isDisabled="isResponding || optimizingProxy || !chatId"
                  :chatId="chatId"
                  :rows="rows"
                  :canSend="canSend"
                  @send="emit('send')"
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
                     @click="emit('newChat')">
                <v-icon class="btn-icon-pink">mdi-chat-plus</v-icon>
              </v-btn>
            </template>
            <span>New Chat</span>
          </v-tooltip>

          <PromptSelector @selected="(item: any) => emit('promptSelected', item.prompt, false)"
                          @edit="emit('openPromptManager')" />
          <ExpertSelector @selected="(item: any, autoSend: boolean) => emit('promptSelected', item.prompt, autoSend)" />

          <v-tooltip content-class="bg-red-lighten-1"
                     location="bottom">
            <template v-slot:activator="{ props: tooltipProps }">
              <v-btn :disabled="messagesCount < 2 || isResponding"
                     @click="emit('summarize')"
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

          <OptimizePromptButton v-model:optimizing="optimizingProxy"
                                v-model:input="inputProxy"
                                :len="len"
                                :isResponding="isResponding" />
        </div>

        <div class="d-flex align-center justify-end">
          <FileUploader ref="fileUploaderRef"
                        v-model:fileDataUri="fileDataUriProxy"
                        v-model:fileInput="fileInput" />
          <MicButton ref="micButtonRef"
                     v-model="inputProxy"
                     :disabled="isResponding || optimizingProxy"
                     :maxLen="maxLen"
                     :currentLen="len"
                     @listening-change="(v: boolean) => (micListening = v)" />
          <span class="text-grey">{{ `${len}/${maxLen}` }}</span>
          <v-btn v-if="isResponding"
                 icon
                 variant="plain"
                 color="red"
                 :ripple="false"
                 style="background-color: transparent;"
                 @click="emit('stopGeneration')">
            <v-icon>mdi-stop</v-icon>
          </v-btn>
          <v-btn v-else
                 icon
                 variant="plain"
                 color="red"
                 :ripple="false"
                 style="background-color: transparent;"
                 :disabled="!canSend || micListening"
                 @click="emit('send')">
            <v-icon>mdi-send</v-icon>
          </v-btn>
        </div>
      </div>
    </div>

    <div class="chat-footer my-3 d-flex align-center justify-center flex-wrap">
      <AIFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import Textarea from './AI.Textarea.vue';
import PromptSelector from './AI.PromptSelector.vue';
import ExpertSelector from './AI.ExpertSelector.vue';
import FileUploader from './AI.FileUploader.vue';
import OptimizePromptButton from './AI.OptimizePromptButton.vue';
import MicButton from './AI.MicButton.vue';
import AIFooter from './AI.Footer.vue';

const props = defineProps<{
  input: string;
  optimizing: boolean;
  fileDataUri: string | null;
  isResponding: boolean;
  chatId: string | null;
  messagesCount: number;
}>();

const emit = defineEmits<{
  'update:input': [v: string];
  'update:optimizing': [v: boolean];
  'update:fileDataUri': [v: string | null];
  send: [];
  newChat: [];
  openPromptManager: [];
  summarize: [];
  stopGeneration: [];
  promptSelected: [prompt: string, autoSend: boolean];
}>();

const maxLen = 20000;
const maxRows = 5;

const textareaRef = ref<any>(null);
const micButtonRef = ref<any>(null);
const fileUploaderRef = ref<any>(null);
const micListening = ref(false);
const fileInput = ref<File | null>(null);

const inputProxy = computed({
  get: () => props.input,
  set: (v) => emit('update:input', v),
});

const optimizingProxy = computed({
  get: () => props.optimizing,
  set: (v) => emit('update:optimizing', v),
});

const fileDataUriProxy = computed({
  get: () => props.fileDataUri,
  set: (v) => emit('update:fileDataUri', v),
});

const len = computed(() => props.input.length);

const rows = computed(() => {
  if (props.input) {
    let count = (props.input.match(/\n/g) || []).length + 1;
    const wrappingCount = Math.floor(props.input.length / 30);
    count = count > wrappingCount ? count : wrappingCount;
    return count > maxRows ? maxRows : count;
  }
  return 1;
});

const canSend = computed(() => !props.isResponding && len.value > 0 && len.value <= maxLen);

function stopMic() {
  micButtonRef.value?.stop?.();
}

function removeFile() {
  fileUploaderRef.value?.removeFile?.();
}

async function focusInput() {
  await nextTick();
  textareaRef.value?.inputRef?.focus?.();
}

defineExpose({ stopMic, removeFile, focusInput });
</script>

<style lang="scss">
.input-block {
  border-radius: var(--radius-lg);
  background: rgba(var(--v-theme-surface)) !important;
  border: 1px solid var(--border-color, #DCDCDC);
  width: 100%;
  min-width: 0;
  margin: 0 auto;

  @media (max-width: 960px) {
    width: 100%;
    min-width: 0;
    padding: 0 12px;
  }

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
</style>
