<template>
  <div>
    <v-tooltip location="bottom"
               content-class="bg-red-lighten-1">
      <template v-slot:activator="{ props: tooltipProps }">
        <span v-bind="tooltipProps">
          <v-btn icon
                 variant="plain"
                 color="red"
                 style="background-color: transparent;"
                 :disabled="disabled || !isSupported"
                 :class="{ 'mic-pulsing': isListening }"
                 :ripple="false"
                 @click="toggle">
            <v-icon v-if="!isListening">mdi-microphone</v-icon>
            <v-icon v-else
                    class="mic-glow">mdi-stop-circle</v-icon>
          </v-btn>
        </span>
      </template>
      <span>{{ tooltipText }}</span>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: string;
  disabled: boolean;
  maxLen: number;
  currentLen: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'listening-change', value: boolean): void;
}>();

const isListening = ref(false);
const recognition = ref<any>(null);
const interimText = ref('');

const isSupported = computed(() => {
  return typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
});

const navigatorLang = computed(() => {
  return (typeof navigator !== 'undefined' && (navigator.language || (navigator as any).userLanguage)) || 'en-US';
});

const tooltipText = computed(() => {
  if (!isSupported.value) return 'Speech input is not supported in this browser';
  return isListening.value ? 'Stop voice input' : 'Voice input';
});

function toggle() {
  if (props.disabled) return;
  if (!isSupported.value) return;
  if (isListening.value) stop();
  else start();
}

function start() {
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition.value = new SR();
    recognition.value.lang = navigatorLang.value || 'en-US';
    recognition.value.interimResults = true;
    recognition.value.continuous = false;

    recognition.value.onstart = () => {
      isListening.value = true;
      emit('listening-change', true);
      interimText.value = '';
    };

    recognition.value.onresult = (event: any) => {
      let finalDelta = '';
      interimText.value = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript || '';
        if (res.isFinal) finalDelta += text;
        else interimText.value += text;
      }
      if (finalDelta) appendText(finalDelta);
    };

    recognition.value.onerror = (e: any) => {
      // Common errors: no-speech, audio-capture, not-allowed
      console.error('Speech recognition error:', e);
      stop();
    };

    recognition.value.onend = () => {
      isListening.value = false;
      emit('listening-change', false);
      recognition.value = null;
      interimText.value = '';
    };

    recognition.value.start();
  } catch (err) {
    console.error('Failed to start recognition', err);
    stop();
  }
}

function stop() {
  try {
    if (recognition.value) {
      recognition.value.stop();
      recognition.value.onstart = null;
      recognition.value.onresult = null;
      recognition.value.onerror = null;
      recognition.value.onend = null;
    }
  } catch (_) { /* noop */ }
  isListening.value = false;
  emit('listening-change', false);
  recognition.value = null;
  interimText.value = '';
}

function appendText(delta: string) {
  if (!delta) return;
  const remaining = Math.max(0, props.maxLen - props.currentLen);
  if (remaining <= 0) {
    stop();
    return;
  }
  const trimmedDelta = delta.trim();
  const toAdd = trimmedDelta.slice(0, remaining);
  if (!toAdd) return;
  const base = props.modelValue || '';
  const needsSpace = base.length > 0 && !base.endsWith(' ') && !base.endsWith('\n');
  const next = `${base}${needsSpace ? ' ' : ''}${toAdd}`;
  emit('update:modelValue', next);
}

onUnmounted(() => {
  stop();
});

// Expose for testing
defineExpose({ isListening, tooltipText, appendText, stop });
</script>

<style scoped>
/* Pulse ring on the button while listening */
.mic-pulsing {
  animation: micPulse 1.25s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.6);
  border-radius: 50%;
}

@keyframes micPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.6);
    transform: scale(1);
  }

  70% {
    box-shadow: 0 0 0 12px rgba(var(--v-theme-primary), 0);
    transform: scale(1.08);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0);
    transform: scale(1);
  }
}

/* Soft glow on the icon while listening */
.mic-glow {
  animation: micGlow 1.25s ease-in-out infinite;
}

@keyframes micGlow {
  0% {
    text-shadow: 0 0 4px rgba(var(--v-theme-primary), 0.6);
  }

  50% {
    text-shadow: 0 0 10px rgba(var(--v-theme-primary), 0.9);
  }

  100% {
    text-shadow: 0 0 4px rgba(var(--v-theme-primary), 0.6);
  }
}

/* Optional: subtle pulse when listening */
.listening {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.06);
  }

  100% {
    transform: scale(1);
  }
}
</style>
