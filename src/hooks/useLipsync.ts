import { useEffect, useRef, useState } from 'react';

/**
 * Mouth states for the cartoon cat avatar (cat_0 … cat_3).
 *   0 – closed (silence / M,B,P)
 *   1 – slightly open (soft consonants, quiet speech)
 *   2 – open (vowels, normal speech)
 *   3 – wide open (loud / open vowels, laughing)
 */
export type MouthState = 0 | 1 | 2 | 3;

const FFT_SIZE = 2048;

/** Frequency bands (Hz) used for simple viseme detection */
const BANDS = [
  [50, 200],   // 0 – low energy
  [200, 400],  // 1 – F1 lower
  [400, 800],  // 2 – F1 mid (open vowels)
  [800, 1500], // 3 – F2 front
  [1500, 2500],// 4 – F2/F3
  [2500, 4000],// 5 – fricatives
  [4000, 8000],// 6 – high fricatives
] as const;

function bandEnergy(data: Uint8Array, binWidth: number, lo: number, hi: number): number {
  const startBin = Math.round(lo / binWidth);
  const endBin = Math.min(Math.round(hi / binWidth), data.length - 1);
  let sum = 0;
  let count = 0;
  for (let i = startBin; i <= endBin; i++) {
    sum += data[i];
    count++;
  }
  return count > 0 ? sum / count / 255 : 0;
}

/**
 * Analyse a MediaStream in real-time and return a MouthState (0–3)
 * suited for the 4-frame cat avatar.
 */
export function useLipsync(stream: MediaStream | null): MouthState {
  const [mouth, setMouth] = useState<MouthState>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const prevMouthRef = useRef<MouthState>(0);
  const holdCountRef = useRef(0);

  useEffect(() => {
    if (!stream) {
      setMouth(0);
      return;
    }

    // Create AudioContext + AnalyserNode
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.4;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    // Don't connect analyser to destination — we only analyse, LiveKit plays audio separately

    const data = new Uint8Array(analyser.frequencyBinCount);
    const binWidth = ctx.sampleRate / FFT_SIZE;

    ctxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
    dataRef.current = data;

    const tick = () => {
      analyser.getByteFrequencyData(data);

      // Compute energy per band
      const bands = BANDS.map(([lo, hi]) => bandEnergy(data, binWidth, lo, hi));

      // Overall volume (average of all bands)
      const volume = bands.reduce((s, v) => s + v, 0) / bands.length;

      // Determine mouth state
      let next: MouthState;

      if (volume < 0.04) {
        // Silence
        next = 0;
      } else if (volume < 0.10) {
        // Quiet — slightly open
        next = 1;
      } else {
        // Speaking — check frequency profile
        const lowMid = (bands[1] + bands[2]) / 2;   // F1 region (openness)
        const highMid = (bands[4] + bands[5]) / 2;   // F2/fricative region

        if (volume > 0.25 && lowMid > 0.15) {
          // Loud open vowel → wide open
          next = 3;
        } else if (lowMid > highMid) {
          // Open vowels dominate → open mouth
          next = 2;
        } else {
          // Consonants / fricatives → slightly open
          next = 1;
        }
      }

      // Hold each state for at least 5 frames (~80ms) to avoid jitter
      if (next !== prevMouthRef.current) {
        holdCountRef.current++;
        if (holdCountRef.current >= 5) {
          prevMouthRef.current = next;
          holdCountRef.current = 0;
          setMouth(next);
        }
      } else {
        holdCountRef.current = 0;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      ctx.close();
      ctxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [stream]);

  return mouth;
}
