<!-- AI.LiveTranscript.vue — Scrolling transcript panel for Live Mode -->
<template>
  <div class="live-transcript" ref="transcriptEl">
    <div
      v-for="entry in transcript"
      :key="entry.id"
      class="transcript-row"
      :class="entry.role === 'user' ? 'transcript-row--user' : 'transcript-row--assistant'"
    >
      <div
        class="transcript-bubble"
        :class="{
          'transcript-bubble--user': entry.role === 'user',
          'transcript-bubble--assistant': entry.role === 'assistant',
          'transcript-bubble--interrupted': entry.isInterrupted,
        }"
      >
        <span class="transcript-text">{{ entry.text }}</span>
        <span v-if="entry.isInterrupted" class="transcript-interrupted-label"> ↩ interrupted</span>
      </div>
    </div>
    <div v-if="transcript.length === 0" class="transcript-empty text-grey">
      Start speaking to see the conversation here.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { TranscriptEntry } from '../store/live';

const props = defineProps<{
  transcript: TranscriptEntry[];
}>();

const transcriptEl = ref<HTMLElement | null>(null);

watch(
  () => props.transcript.length,
  async () => {
    await nextTick();
    if (transcriptEl.value) {
      transcriptEl.value.scrollTop = transcriptEl.value.scrollHeight;
    }
  }
);
</script>

<style scoped lang="scss">
.live-transcript {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 16px;
  height: 100%;
}

.transcript-row {
  display: flex;
}

.transcript-row--user {
  justify-content: flex-end;
}

.transcript-row--assistant {
  justify-content: flex-start;
}

.transcript-bubble {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 18px;
  line-height: 1.5;
  font-size: 0.95rem;
  word-break: break-word;
}

.transcript-bubble--user {
  background: rgba(var(--v-theme-primary), 0.15);
  border-radius: 18px 18px 4px 18px;
}

.transcript-bubble--assistant {
  background: rgba(var(--v-theme-surface-variant, 128, 128, 128), 0.12);
  border-radius: 4px 18px 18px 18px;
}

.transcript-bubble--interrupted {
  opacity: 0.65;
  text-decoration: line-through;
  text-decoration-color: rgba(var(--v-theme-error), 0.6);
}

.transcript-interrupted-label {
  font-size: 0.78rem;
  margin-left: 6px;
  opacity: 0.7;
  text-decoration: none;
  font-style: italic;
}

.transcript-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: currentColor;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.transcript-empty {
  text-align: center;
  padding: 32px 16px;
  font-size: 0.9rem;
}
</style>
