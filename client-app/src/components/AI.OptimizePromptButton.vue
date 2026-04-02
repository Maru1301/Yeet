<template>
  <v-tooltip content-class="bg-purple-lighten-1"
             location="bottom">
    <template v-slot:activator="{ props: tooltipProps }">
      <v-btn v-bind="tooltipProps"
             icon
             variant="text"
             :size="useXSmall ? 'x-small' : 'small'"
             :ripple="false"
             :disabled="len < 1 || isResponding"
             class="functionalBtn"
             @click="optimizePrompt"
             :loading="optimizing">
        <v-icon class="btn-icon-purple">mdi-auto-fix</v-icon>
      </v-btn>
    </template>
    <span>Optimize Prompt</span>
  </v-tooltip>
</template>

<script setup lang="ts">
import { gptService } from '../global/gpt.api.service';
import { OptimizationPrompt } from './prompts/OptimizationPrompt';

const props = defineProps<{
  input: string;
  len: number;
  isResponding: boolean;
  optimizing: boolean;
  useXSmall?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:optimizing', value: boolean): void;
  (e: 'update:input', value: string): void;
}>();

async function optimizePrompt() {
  const rawInput = props.input;

  emit('update:optimizing', true); // Start optimizing, update parent's optimizing state

  try {
    const response = await gptService.ask.request({
      AgentName: `${AGENT_NAME}`,
      Instruction: OptimizationPrompt,
      Message: `Please improve the following prompt and return only the result: ${rawInput}`
    }, undefined as any);

    const reader = (response as any).body.getReader();
    emit('update:input', ''); // Clear input
    reader.read().then(async function pump({ done, value }: { done: boolean; value: Uint8Array; }) {
      if (done) {
        emit('update:optimizing', false); // Optimization complete
        emit('update:input', (props.input || '').trim());
        return '';
      } else {
        // Follows AI.Chat streaming format ({"v":"..."} / {"e":"..."} separated by \n\n)
        const buffer = new TextDecoder('utf-8').decode(value, { stream: true });
        let text = '';
        if (buffer.startsWith('{ "statusCode":') || buffer.startsWith('<html>')) {
          console.error(buffer);
          text = 'An error occurred in the AI system. Please try again.';
        } else {
          text = parseStreamBuffer(buffer);
        }
        emit('update:input', (props.input || '') + text); // Update input
        return reader.read().then(pump);
      }
    });
  } catch (error) {
    emit('update:optimizing', false); // Optimization failed
    emit('update:input', rawInput); // Restore original input
    console.error('Error optimizing prompt:', error);
  }
}

// Same stream buffer parser as AI.Chat.vue: extracts {"v": "..."} or {"e": "..."}
function parseStreamBuffer(buffer: string): string {
  let text = '';
  const events = buffer.split('\n\n');
  events.forEach(chunk => {
    const match = chunk.trim().match(/\{.*"[ve]"\s*:\s*".*?"\s*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.v) text += parsed.v;
        if (parsed.e) console.error('Error Stream Buffer:', parsed.e);
      } catch (e) {
        console.error('Error Stream Buffer:', e);
      }
    }
  });
  return text;
}
</script>
