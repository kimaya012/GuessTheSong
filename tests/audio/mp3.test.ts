import { describe, expect, it } from "vitest";
import { mp3DurationSeconds, sliceMp3ToSeconds } from "@/lib/audio/mp3";

// MPEG-1 Layer III, 128 kbps, 48 kHz, no padding → 384-byte frames of 24 ms.
const FRAME_BYTES = 384;
function frames(count: number): Uint8Array {
  const buf = new Uint8Array(count * FRAME_BYTES);
  for (let i = 0; i < count; i++) {
    buf.set([0xff, 0xfb, 0x94, 0x64], i * FRAME_BYTES);
    buf[i * FRAME_BYTES + 4] = i % 256; // payload noise
  }
  return buf;
}

function withId3(body: Uint8Array, tagSize: number): Uint8Array {
  const header = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, (tagSize >> 7) & 0x7f, tagSize & 0x7f]);
  const out = new Uint8Array(10 + tagSize + body.length);
  out.set(header, 0);
  out.set(body, 10 + tagSize);
  return out;
}

describe("mp3 slicing", () => {
  const tenSeconds = frames(417); // 417 * 24ms ≈ 10.008s

  it("measures duration from frame headers", () => {
    expect(mp3DurationSeconds(tenSeconds)).toBeCloseTo(10.008, 3);
  });

  it("returns only whole frames covering the requested seconds", () => {
    expect(sliceMp3ToSeconds(tenSeconds, 0.4).length).toBe(17 * FRAME_BYTES);
    expect(sliceMp3ToSeconds(tenSeconds, 9).length).toBe(375 * FRAME_BYTES);
  });

  it("returns the whole buffer when asked for more than it has", () => {
    expect(sliceMp3ToSeconds(tenSeconds, 60).length).toBe(tenSeconds.length);
  });

  it("drops a leading ID3v2 tag", () => {
    const sliced = sliceMp3ToSeconds(withId3(frames(100), 300), 1);
    expect(sliced.length).toBe(42 * FRAME_BYTES);
    expect([...sliced.slice(0, 2)]).toEqual([0xff, 0xfb]);
  });

  it("returns nothing for non-mp3 data", () => {
    expect(sliceMp3ToSeconds(new TextEncoder().encode("definitely not audio"), 5).length).toBe(0);
  });
});
