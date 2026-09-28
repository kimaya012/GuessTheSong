import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

// Offline only (scripts): cut the first `seconds` of a preview into CBR
// 128 kbps / 48 kHz MP3 with no ID3/Xing header, so every frame is exactly
// 384 bytes / 24 ms and any whole-frame prefix is a valid shorter clip.
export async function transcodeFirstSeconds(url: string, seconds = 9): Promise<Uint8Array> {
  if (!ffmpegPath) throw new Error("ffmpeg-static binary not available on this platform");
  const args = [
    "-hide_banner",
    "-loglevel", "error",
    "-i", url,
    "-t", String(seconds),
    "-vn",
    "-ac", "2",
    "-ar", "48000",
    "-c:a", "libmp3lame",
    "-b:a", "128k",
    "-write_xing", "0",
    "-id3v2_version", "0",
    "-f", "mp3",
    "pipe:1",
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as unknown as string, args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let stderr = "";
    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr.on("data", (c: Buffer) => (stderr += c.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(new Uint8Array(Buffer.concat(chunks)));
      else reject(new Error(`ffmpeg exited with ${code}: ${stderr.trim().slice(0, 500)}`));
    });
  });
}
