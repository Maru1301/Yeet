// live.audio.service.ts — AudioWorklet mic capture + PCM playback for Live Mode

import { liveApiService } from './live.api.service';

// The worklet source is inlined as a blob URL so no separate file asset is
// required — preserving single-binary embed compatibility.
const MIC_PROCESSOR_SRC = `
class MicProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'recording',
      defaultValue: 1,
      minValue: 0,
      maxValue: 1,
      automationRate: 'k-rate',
    }];
  }
  process(inputs, _outputs, parameters) {
    const recording = parameters.recording[0];
    if (recording === 0) return true;
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channelData = input[0];
    if (!channelData || channelData.length === 0) return true;
    const pcm = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}
registerProcessor('mic-processor', MicProcessor);
`;

let micContext: AudioContext | null = null;
let workletNode: AudioWorkletNode | null = null;
let micStream: MediaStream | null = null;

let playContext: AudioContext | null = null;
let playNextTime = 0;

/** Converts a base64 string to a Uint8Array. */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Converts Int16 PCM bytes to Float32 samples. */
function int16ToFloat32(bytes: Uint8Array): Float32Array {
  const samples = bytes.length / 2;
  const out = new Float32Array(samples);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < samples; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

export const liveAudioService = {
  /**
   * Starts mic capture and sends PCM chunks over the WebSocket.
   * Requires getUserMedia permission to have already been granted or will prompt.
   */
  async startMic(ws: WebSocket): Promise<void> {
    micContext = new AudioContext({ sampleRate: 16000 });

    // Register the worklet via an inline blob URL
    const blob = new Blob([MIC_PROCESSOR_SRC], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    await micContext.audioWorklet.addModule(blobUrl);
    URL.revokeObjectURL(blobUrl);

    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const source = micContext.createMediaStreamSource(micStream);

    workletNode = new AudioWorkletNode(micContext, 'mic-processor');
    workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      // Encode PCM bytes as base64
      const bytes = new Uint8Array(event.data);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      liveApiService.send(ws, { type: 'audio', data: b64 });
    };

    source.connect(workletNode);
    workletNode.connect(micContext.destination);
  },

  /** Stops mic capture and tears down the audio pipeline. */
  stopMic(): void {
    if (workletNode) {
      workletNode.disconnect();
      workletNode = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (micContext) {
      micContext.close();
      micContext = null;
    }
  },

  /**
   * Sets the AudioWorklet `recording` parameter (1 = capturing, 0 = gated).
   * Used for push-to-talk: call setRecording(1) on pointerdown, setRecording(0) on pointerup.
   */
  setRecording(value: 0 | 1): void {
    if (!workletNode) return;
    const param = workletNode.parameters.get('recording');
    if (param) {
      param.setValueAtTime(value, 0);
    }
  },

  /** Returns milliseconds until the currently-queued audio finishes playing. */
  getRemainingPlaybackMs(): number {
    if (!playContext) return 0;
    return Math.max(0, (playNextTime - playContext.currentTime) * 1000);
  },

  /**
   * Decodes a base64 PCM chunk (24 kHz Int16) and schedules it for gapless playback.
   */
  playChunk(base64PCM: string): void {
    if (!playContext) {
      playContext = new AudioContext({ sampleRate: 24000 });
      playNextTime = playContext.currentTime;
    }

    const bytes = base64ToBytes(base64PCM);
    const samples = int16ToFloat32(bytes);
    const sampleRate = 24000;

    const buffer = playContext.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);

    const source = playContext.createBufferSource();
    source.buffer = buffer;
    source.connect(playContext.destination);

    const startAt = Math.max(playContext.currentTime, playNextTime);
    source.start(startAt);
    playNextTime = startAt + buffer.duration;
  },

  /** Cancels any queued audio playback. */
  stopPlayback(): void {
    if (playContext) {
      playContext.close();
      playContext = null;
      playNextTime = 0;
    }
  },
};
