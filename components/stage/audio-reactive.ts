"use client";

// Tiny module-level bus between the snippet player (which owns the Web Audio
// graph) and the 3D stage (which reads levels every frame). A plain module
// avoids React re-renders at 60fps.
let analyser: AnalyserNode | null = null;
let bins: Uint8Array<ArrayBuffer> | null = null;
let playing = false;

export function registerAnalyser(node: AnalyserNode | null): void {
  analyser = node;
  bins = node ? new Uint8Array(node.frequencyBinCount) : null;
}

export function setAudioPlaying(value: boolean): void {
  playing = value;
}

// Fills `out` (one slot per equalizer column) with 0..1 levels from
// log-spaced frequency bands. Returns false when nothing is playing.
export function readLevels(out: Float32Array): boolean {
  if (!analyser || !bins || !playing) return false;
  analyser.getByteFrequencyData(bins);
  const usable = Math.floor(bins.length * 0.7); // top bins are mostly empty
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(Math.pow(usable, i / out.length));
    const end = Math.max(start + 1, Math.floor(Math.pow(usable, (i + 1) / out.length)));
    let peak = 0;
    for (let b = start; b < end && b < usable; b++) peak = Math.max(peak, bins[b]);
    out[i] = peak / 255;
  }
  return true;
}
