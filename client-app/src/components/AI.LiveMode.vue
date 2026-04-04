<!-- AI.LiveMode.vue — Live Mode full UI (status, transcript, controls) -->
<template>
  <div class="live-mode fill-height d-flex flex-column">

    <!-- Header -->
    <div class="live-header d-flex align-center px-4 py-3">
      <v-btn icon variant="text" @click="$router.push('/')">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <span class="text-h6 font-weight-medium ml-2">Live</span>
      <v-spacer />
      <v-chip
        :color="statusColor"
        variant="tonal"
        size="small"
        class="text-capitalize"
      >
        <v-icon start size="12" :class="{ 'pulse-icon': status === 'active' }">
          mdi-circle
        </v-icon>
        {{ statusLabel }}
      </v-chip>
    </div>

    <v-divider />

    <!-- Middle: avatar + transcript side by side -->
    <div class="live-middle flex-1-1-0 d-flex flex-row" style="min-height: 0;">

      <!-- Left panel: Yeet avatar (25%) -->
      <div class="live-avatar-panel d-flex align-center justify-center">
        <img :src="yeetAvatar" class="yeet-avatar" alt="Yeet" />
      </div>

      <!-- Transcript (75%) -->
      <div class="live-transcript-area flex-1-1-0" style="min-width: 0;">
        <LiveTranscript :transcript="liveStore.transcript" />
      </div>

    </div>

    <!-- Error banner -->
    <v-alert
      v-if="errorMessage"
      type="error"
      density="compact"
      class="mx-4 mb-2"
      closable
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>

    <!-- Settings + Controls -->
    <div class="live-controls pa-4">

        <!-- Settings row (only when idle) -->
        <div v-if="status === 'idle'" class="live-settings mb-4">
          <VoiceSelector :disabled="false" />
          <div class="d-flex align-center mt-3">
            <span class="text-body-2 mr-3">Push-to-talk</span>
            <v-switch
              v-model="liveStore.isPushToTalk"
              density="compact"
              hide-details
              color="primary"
            />
          </div>
        </div>

        <!-- PTT Talk button -->
        <div
          v-if="status === 'active' && liveStore.isPushToTalk"
          class="d-flex justify-center mb-3"
        >
          <v-btn
            :color="isPTTHeld ? 'primary' : 'default'"
            size="x-large"
            rounded="xl"
            @pointerdown="onPTTDown"
            @pointerup="onPTTUp"
            @pointercancel="onPTTUp"
          >
            <v-icon start>mdi-microphone</v-icon>
            {{ isPTTHeld ? 'Listening…' : 'Hold to Talk' }}
          </v-btn>
        </div>

        <!-- Mic / AI speaking indicators -->
        <div v-if="status === 'active' && !liveStore.isPushToTalk" class="d-flex justify-center gap-3 mb-3">
          <v-chip color="primary" variant="tonal" size="small">
            <v-icon start size="14" class="pulse-icon">mdi-microphone</v-icon>
            Listening
          </v-chip>
          <v-chip v-if="isAISpeaking" color="secondary" variant="tonal" size="small">
            <v-icon start size="14" class="pulse-icon">mdi-volume-high</v-icon>
            Speaking
          </v-chip>
        </div>

        <!-- Start / End button -->
        <div class="d-flex justify-center">
          <v-btn
            v-if="status === 'idle' || status === 'ending'"
            color="primary"
            size="large"
            rounded="pill"
            width="120"
            :loading="status === 'ending'"
            @click="startSession"
          >
            <v-icon start>mdi-phone</v-icon>
            Start
          </v-btn>
          <v-btn
            v-else-if="status === 'connecting' || status === 'active'"
            color="error"
            size="large"
            rounded="pill"
            width="120"
            :loading="status === 'connecting'"
            @click="endSession"
          >
            <v-icon start>mdi-phone-hangup</v-icon>
            End
          </v-btn>
        </div>

      </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLiveStore } from '../store/live';
import { liveApiService } from '../global/live.api.service';
import { liveAudioService } from '../global/live.audio.service';
import type { ServerMessage } from '../global/live.api.service';
import LiveTranscript from './AI.LiveTranscript.vue';
import VoiceSelector from './AI.VoiceSelector.vue';

const router = useRouter();
const liveStore = useLiveStore();

const yeetClosed = new URL('../assets/yeet.png', import.meta.url).href;
const yeetOpen   = new URL('../assets/yeet_mouth_open.png', import.meta.url).href;
const yeetAvatar = ref(yeetClosed);
let talkTimer: ReturnType<typeof setTimeout> | null = null;

function startTalking() {
  let mouthOpen = false;
  function tick() {
    mouthOpen = !mouthOpen;
    yeetAvatar.value = mouthOpen ? yeetOpen : yeetClosed;
    talkTimer = setTimeout(tick, 80 + Math.random() * 280);
  }
  tick();
}

function stopTalking() {
  if (talkTimer) {
    clearTimeout(talkTimer);
    talkTimer = null;
  }
  yeetAvatar.value = yeetClosed;
}

const errorMessage = ref('');
const isAISpeaking = ref(false);
const isPTTHeld = ref(false);

let ws: WebSocket | null = null;

const status = computed(() => liveStore.status);

const statusLabel = computed(() => {
  switch (liveStore.status) {
    case 'idle':       return 'Idle';
    case 'connecting': return 'Connecting';
    case 'active':     return 'Listening';
    case 'ending':     return 'Ending';
  }
});

const statusColor = computed(() => {
  switch (liveStore.status) {
    case 'active':    return 'success';
    case 'connecting':
    case 'ending':    return 'warning';
    default:          return 'default';
  }
});

async function startSession() {
  errorMessage.value = '';
  liveStore.reset();
  liveStore.setStatus('connecting');

  ws = liveApiService.connect('gemini-2.5-flash-native-audio-preview-12-2025', liveStore.voice);

  ws.onmessage = async (event: MessageEvent) => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'session_ready':
        liveStore.setSessionId(msg.sessionId);
        liveStore.setStatus('active');
        liveApiService.send(ws!, { type: 'ready' });
        try {
          await liveAudioService.startMic(ws!);
          if (liveStore.isPushToTalk) {
            liveAudioService.setRecording(0);
          }
        } catch (err: any) {
          errorMessage.value = 'Microphone access denied: ' + (err?.message || err);
          endSession();
        }
        break;

      case 'audio':
        if (!isAISpeaking.value) {
          isAISpeaking.value = true;
          startTalking();
        }
        liveAudioService.playChunk(msg.data);
        clearTimeout((window as any)._aiSpeakTimer);
        (window as any)._aiSpeakTimer = setTimeout(() => {
          isAISpeaking.value = false;
          stopTalking();
        }, liveAudioService.getRemainingPlaybackMs() + 100);
        break;

      case 'transcript':
        liveStore.appendTranscript(msg.role, msg.text);
        if (msg.turnComplete) {
          liveStore.markTurnComplete(msg.role);
        }
        break;

      case 'interrupted':
        liveStore.markInterrupted();
        liveAudioService.stopPlayback();
        isAISpeaking.value = false;
        stopTalking();
        break;

      case 'session_saved':
        liveStore.setSessionId(msg.sessionId);
        liveStore.setStatus('idle');
        break;

      case 'error':
        errorMessage.value = msg.message;
        liveStore.setStatus('idle');
        stopTalking();
        break;
    }
  };

  ws.onerror = () => {
    errorMessage.value = 'Connection error. Please try again.';
    cleanup();
  };

  ws.onclose = () => {
    if (liveStore.status !== 'idle') {
      liveStore.setStatus('idle');
    }
    ws = null;
  };
}

function endSession() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    liveStore.setStatus('ending');
    liveApiService.send(ws, { type: 'end' });
    liveAudioService.stopMic();
    liveAudioService.stopPlayback();
  } else {
    cleanup();
  }
  stopTalking();
}

function cleanup() {
  liveAudioService.stopMic();
  liveAudioService.stopPlayback();
  if (ws) {
    ws.close();
    ws = null;
  }
  liveStore.setStatus('idle');
  stopTalking();
}

function onPTTDown() {
  isPTTHeld.value = true;
  liveAudioService.setRecording(1);
}

function onPTTUp() {
  isPTTHeld.value = false;
  liveAudioService.setRecording(0);
}

onMounted(() => {
  liveStore.reset();
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped lang="scss">
.live-mode {
  background: rgb(var(--v-theme-background));
}

.live-header {
  flex-shrink: 0;
}

.live-middle {
  overflow: hidden;
}

.live-avatar-panel {
  width: 25%;
  flex-shrink: 0;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.yeet-avatar {
  width: 80%;
  max-width: 220px;
  object-fit: contain;
}

.live-transcript-area {
  overflow: hidden;
}

.live-controls {
  flex-shrink: 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.live-settings {
  border-radius: 12px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-surface-variant, 128, 128, 128), 0.06);
}

.pulse-icon {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.gap-3 {
  gap: 12px;
}
</style>
