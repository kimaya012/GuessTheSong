// Minimal MPEG audio (Layer III) frame walker. Any prefix of whole MP3 frames
// is valid, playable audio, so the server can hand out exactly the unlocked
// part of a snippet without re-encoding at request time.

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
};

interface Frame {
  length: number;
  seconds: number;
}

function readFrame(buf: Uint8Array, offset: number): Frame | null {
  if (offset + 4 > buf.length) return null;
  if (buf[offset] !== 0xff || (buf[offset + 1] & 0xe0) !== 0xe0) return null;
  const version = (buf[offset + 1] >> 3) & 0b11;
  const layer = (buf[offset + 1] >> 1) & 0b11;
  if (version === 1 || layer !== 0b01) return null; // reserved version / not Layer III
  const bitrateIndex = buf[offset + 2] >> 4;
  const sampleRateIndex = (buf[offset + 2] >> 2) & 0b11;
  const padding = (buf[offset + 2] >> 1) & 1;
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null;

  const isV1 = version === 3;
  const bitrate = (isV1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[version][sampleRateIndex];
  const samples = isV1 ? 1152 : 576;
  const length = Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
  return { length, seconds: samples / sampleRate };
}

function id3v2Size(buf: Uint8Array): number {
  if (buf.length < 10 || buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return 0;
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  const hasFooter = (buf[5] & 0x10) !== 0;
  return 10 + size + (hasFooter ? 10 : 0);
}

function firstFrameOffset(buf: Uint8Array): number {
  const start = id3v2Size(buf);
  const limit = Math.min(buf.length, start + 8192);
  for (let i = start; i < limit; i++) {
    const frame = readFrame(buf, i);
    if (!frame) continue;
    const next = i + frame.length;
    // Require a second consecutive header (or end of data) to avoid
    // mistaking random 0xFF bytes for a sync word.
    if (next >= buf.length || readFrame(buf, next)) return i;
  }
  return -1;
}

function walk(buf: Uint8Array, maxSeconds: number): { start: number; end: number; seconds: number } {
  const start = firstFrameOffset(buf);
  if (start < 0) return { start: 0, end: 0, seconds: 0 };
  let offset = start;
  let seconds = 0;
  while (seconds < maxSeconds - 1e-6) {
    const frame = readFrame(buf, offset);
    if (!frame || offset + frame.length > buf.length) break;
    offset += frame.length;
    seconds += frame.seconds;
  }
  return { start, end: offset, seconds };
}

export function sliceMp3ToSeconds(buf: Uint8Array, seconds: number): Uint8Array {
  const { start, end } = walk(buf, seconds);
  return buf.slice(start, end);
}

export function mp3DurationSeconds(buf: Uint8Array): number {
  return walk(buf, Number.POSITIVE_INFINITY).seconds;
}
