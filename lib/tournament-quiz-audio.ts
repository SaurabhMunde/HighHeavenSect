/**
 * Subtle synthesized ambient pad + applause-style bursts for Heavenly Tournament
 * (works without extra sound files).
 */

export type AmbientController = {
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

const AMBIENT_MASTER = 0.038;

/** Very quiet two-tone pad (~G3 + B3) */
export function createQuizAmbient(audioContext: AudioContext): AmbientController {
  let disposed = false;
  let running = false;
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.value = 196;
  osc2.frequency.value = 246;

  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.7;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);

  gain.gain.value = 0;

  osc1.start();
  osc2.start();

  function startPad() {
    if (disposed || running) return;
    void audioContext.resume().catch(() => undefined);
    running = true;
    const now = audioContext.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(AMBIENT_MASTER, now + 0.5);
  }

  function stopPad() {
    if (disposed || !running) return;
    running = false;
    const now = audioContext.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.45);
  }

  function disposePad() {
    if (disposed) return;
    disposed = true;
    stopPad();
    try {
      osc1.stop(audioContext.currentTime + 0.5);
      osc2.stop(audioContext.currentTime + 0.5);
    } catch {
      /* noop */
    }
  }

  return {
    start: startPad,
    stop: stopPad,
    dispose: disposePad,
  };
}

/** Short filtered noise bursts in quick succession (~applause) */
export function playApplauseBurst(audioContext: AudioContext, durationSeconds = 2.4) {
  void audioContext.resume().catch(() => undefined);
  const start = audioContext.currentTime;

  let t = start;
  const endAt = start + durationSeconds;

  while (t < endAt) {
    const noiseDur = 0.04 + Math.random() * 0.07;
    const bufferLength = audioContext.sampleRate * noiseDur;
    const buffer = audioContext.createBuffer(1, Math.floor(bufferLength), audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    const bp = audioContext.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800 + Math.random() * 2200;
    bp.Q.value = 0.5;
    const g = audioContext.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22 + Math.random() * 0.12, t + 0.01);
    g.gain.linearRampToValueAtTime(0, t + noiseDur);

    noise.connect(bp);
    bp.connect(g);
    g.connect(audioContext.destination);

    noise.start(t);
    noise.stop(t + noiseDur + 0.02);

    t += 0.05 + Math.random() * 0.08;
  }
}
