import { useEffect, useRef, useState } from 'react';

/**
 * Mouth states for the cartoon cat avatar.
 *   0 – closed  (silence, rest)
 *   1 – slightly open  (M/B/P, soft consonants, sibilants)
 *   2 – open + teeth  (AH, wide vowels, plosives)
 *   3 – wide open round  (OH, OO, loud speech)
 *
 * Thresholds and band logic adapted from lipsync-engine
 * (github.com/Amoner/lipsync-engine — FrequencyAnalyzer.js)
 */
export type MouthState = 0 | 1 | 2 | 3;

const FFT_SIZE = 256; // Small FFT for low latency (like lipsync-engine)
const SILENCE_THRESHOLD = 0.015; // RMS silence cutoff from lipsync-engine
const HOLD_FRAMES = 2; // Min frames before switching (from lipsync-engine)
const SMOOTHING = 0.5; // AnalyserNode smoothingTimeConstant

/**
 * Extract 5 frequency band energies (sub, low, mid, high, veryHigh)
 * matching lipsync-engine's FrequencyAnalyzer bands
 */
function extractBands(data: Uint8Array, binCount: number, sampleRate: number) {
  const nyquist = sampleRate / 2;
  const binHz = nyquist / binCount;

  // Band boundaries matching lipsync-engine
  const ranges = [
    [80, 300],    // sub — fundamental, nasals
    [300, 800],   // low — F1 region
    [800, 2500],  // mid — F2, vowel formants
    [2500, 5500], // high — fricatives, sibilants
    [5500, 11000],// veryHigh — high fricatives
  ];

  return ranges.map(([lo, hi]) => {
    const startBin = Math.max(0, Math.round(lo / binHz));
    const endBin = Math.min(binCount - 1, Math.round(hi / binHz));
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) sum += data[i];
    const count = endBin - startBin + 1;
    return count > 0 ? (sum / count) / 255 : 0;
  });
}

/** Calculate RMS from frequency data (approximation) */
function calcRMS(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 255;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

/**
 * Classify bands into a simple viseme (A–F) using
 * lipsync-engine thresholds, then map to MouthState 0–3.
 *
 * Simple viseme → MouthState mapping:
 *   A (rest)        → 0  (catOk1 — closed)
 *   B (M/B/P)       → 1  (catOk2 — slightly open)
 *   C (EE/S)        → 1  (catOk2 — slightly open)
 *   D (AH wide)     → 2  (cat3Ok — open + teeth)
 *   E (OH round)    → 3  (cat4Ok — wide open)
 *   F (OO/F/V)      → 3  (cat4Ok — wide open)
 */
function classifyMouth(bands: number[], rms: number): MouthState {
  // Silence gate (lipsync-engine: silenceThreshold = 0.015)
  if (rms < SILENCE_THRESHOLD) return 0;

  const [sub, low, mid, high, veryHigh] = bands;
  const totalEnergy = sub + low + mid + high + veryHigh;
  if (totalEnergy < 0.01) return 0;

  // Intensity (overall loudness normalized)
  const intensity = Math.min(1, rms / 0.3);

  // === Sibilants / high fricatives (S, Z, SH) → C → state 1 ===
  if (totalEnergy > 0 && (high + veryHigh) / totalEnergy > 0.55 && high > 0.15) {
    return 1;
  }

  // === Fricatives (F, V, TH) → F → state 3 ===
  if (totalEnergy > 0 && (mid + high) / totalEnergy > 0.5 && high > 0.1 && low < 0.15) {
    return 3;
  }

  // === Nasals (M, N) → B → state 1 ===
  if (sub > 0.2 && low > 0.15 && high < 0.08) {
    return 1;
  }

  // === Plosives (P, B, T, D) → D → state 2 ===
  if (intensity > 0.6) {
    // Spectral flatness check (broad spectrum = plosive)
    const minBand = Math.min(sub, low, mid, high);
    const maxBand = Math.max(sub, low, mid, high);
    if (maxBand > 0 && minBand / maxBand > 0.4) {
      return 2;
    }
  }

  // === Vowel classification by formant dominance ===
  // Open vowels (AA, AE) — low+mid dominant → D → state 2
  if (low > 0.15 && mid > 0.1 && low > high) {
    return 2;
  }

  // Rounded vowels (O, OH) — sub+low dominant, round → E → state 3
  if (sub > 0.15 && low > mid && high < 0.1) {
    return 3;
  }

  // Front vowels (EE, I) — mid dominant → C → state 1
  if (mid > low && mid > high) {
    return 1;
  }

  // Default: slightly open for any detected speech
  return 1;
}

export function useLipsync(stream: MediaStream | null): MouthState {
  const [mouth, setMouth] = useState<MouthState>(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const prevRef = useRef<MouthState>(0);
  const holdRef = useRef(0);

  useEffect(() => {
    if (!stream) {
      setMouth(0);
      return;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    // Don't connect to destination — LiveKit plays audio separately

    const data = new Uint8Array(analyser.frequencyBinCount);
    ctxRef.current = ctx;

    const tick = () => {
      analyser.getByteFrequencyData(data);

      const rms = calcRMS(data);
      const bands = extractBands(data, analyser.frequencyBinCount, ctx.sampleRate);
      const next = classifyMouth(bands, rms);

      // Hold logic from lipsync-engine (holdFrames = 2)
      if (next !== prevRef.current) {
        holdRef.current++;
        if (holdRef.current >= HOLD_FRAMES) {
          prevRef.current = next;
          holdRef.current = 0;
          setMouth(next);
        }
      } else {
        holdRef.current = 0;
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
    };
  }, [stream]);

  return mouth;
}
