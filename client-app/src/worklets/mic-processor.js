/**
 * mic-processor.js — AudioWorklet processor for PCM capture at 16 kHz mono.
 *
 * Registered via inline blob URL in live.audio.service.ts so no separate
 * asset file is needed (preserves single-binary embed compatibility).
 *
 * AudioParam:
 *   recording — 1 while mic capture is active, 0 to gate (PTT mode)
 */
class MicProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'recording',
        defaultValue: 1,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate',
      },
    ];
  }

  process(inputs, _outputs, parameters) {
    const recording = parameters.recording[0];
    if (recording === 0) return true;

    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0]; // mono
    if (!channelData || channelData.length === 0) return true;

    // Convert Float32 samples [-1, 1] to Int16 PCM
    const pcm = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Post the raw ArrayBuffer to the main thread
    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor('mic-processor', MicProcessor);
