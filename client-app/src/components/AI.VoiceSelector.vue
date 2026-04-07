<!-- AI.VoiceSelector.vue — Voice preset picker for Live Mode -->
<template>
  <div class="voice-selector">
    <span class="text-body-2 mr-2">Voice</span>
    <v-select
      v-model="selectedVoice"
      :items="voices"
      item-title="displayName"
      item-value="id"
      density="compact"
      variant="outlined"
      hide-details
      :disabled="disabled || loading"
      :loading="loading"
      style="max-width: 220px;"
      @update:model-value="onVoiceChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLiveStore } from '../store/live';
import { liveApiService } from '../global/live.api.service';
import type { VoicePreset } from '../global/live.api.service';

const props = defineProps<{
  disabled: boolean;
}>();

const liveStore = useLiveStore();
const voices = ref<VoicePreset[]>([]);
const loading = ref(false);
const selectedVoice = ref(liveStore.voice);

onMounted(async () => {
  loading.value = true;
  try {
    voices.value = await liveApiService.getVoices();
  } catch {
    // fallback: show default list
    voices.value = [
      { id: 'Aoede', displayName: 'Aoede — Warm' },
      { id: 'Charon', displayName: 'Charon — Deep' },
      { id: 'Fenrir', displayName: 'Fenrir — Energetic' },
      { id: 'Kore', displayName: 'Kore — Clear' },
      { id: 'Puck', displayName: 'Puck — Expressive' },
    ];
  } finally {
    loading.value = false;
  }
});

function onVoiceChange(id: string) {
  liveStore.setVoice(id);
}
</script>

<style scoped lang="scss">
.voice-selector {
  display: flex;
  align-items: center;
}
</style>
