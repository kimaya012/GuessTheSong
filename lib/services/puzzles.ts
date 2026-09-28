import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/lib/db";
import { attempts, dailyPuzzles, puzzleClips, songs, userDevices } from "@/db/schema";
import type { Viewer } from "@/lib/authz/policy";
import {
  MAX_GUESSES,
  SNIPPET_SECONDS,
  hintsUnlocked,
  nextState,
  snippetSecondsFor,
  type AttemptStatus,
  type GuessRecord,
  type HintKey,
} from "@/lib/game/rules";
import { sliceMp3ToSeconds } from "@/lib/audio/mp3";

export class GameError extends Error {
  constructor(public readonly code: "NO_PUZZLE" | "ALREADY_COMPLETED" | "UNKNOWN_SONG") {
    super(code);
  }
}

export interface PuzzleAnswer {
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  genre: string | null;
  durationSec: number | null;
  coverImageUrl: string | null;
  externalUrl: string | null;
}

export interface PuzzleShell {
  puzzleNumber: number;
  date: string;
  maxGuesses: number;
  snippetSeconds: number;
  snippetSchedule: readonly number[];
  hints: Partial<Record<HintKey, string | number | null>>;
  guesses: GuessRecord[];
  guessCount: number;
  status: AttemptStatus;
  points: number;
  answer?: PuzzleAnswer;
}

type SongRow = typeof songs.$inferSelect;
type PuzzleRow = typeof dailyPuzzles.$inferSelect;
type AttemptRow = typeof attempts.$inferSelect;

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function ownerFilter(viewer: Viewer) {
  return viewer.userId
    ? eq(attempts.userId, viewer.userId)
    : and(eq(attempts.deviceId, viewer.deviceId), isNull(attempts.userId));
}

function buildShell(puzzle: PuzzleRow, song: SongRow, attempt: AttemptRow | null): PuzzleShell {
  const guesses = (attempt?.guesses as GuessRecord[] | undefined) ?? [];
  const guessCount = attempt?.guessCount ?? 0;
  const status = (attempt?.status as AttemptStatus | undefined) ?? "playing";
  const completed = status !== "playing";

  const metadata: Record<HintKey, string | number | null> = {
    length: formatDuration(song.durationSec),
    releaseYear: song.year,
    genre: song.genre,
    album: song.album,
    artist: song.artist,
  };
  const hints: PuzzleShell["hints"] = {};
  for (const key of hintsUnlocked(guessCount, completed)) hints[key] = metadata[key];

  const shell: PuzzleShell = {
    puzzleNumber: puzzle.puzzleNumber,
    date: puzzle.date,
    maxGuesses: MAX_GUESSES,
    snippetSeconds: snippetSecondsFor(guessCount),
    snippetSchedule: SNIPPET_SECONDS,
    hints,
    guesses,
    guessCount,
    status,
    points: attempt?.points ?? 0,
  };
  // The answer only ever leaves the server once the game is over.
  if (completed) {
    shell.answer = {
      title: song.title,
      artist: song.artist,
      album: song.album,
      year: song.year,
      genre: song.genre,
      durationSec: song.durationSec,
      coverImageUrl: song.coverImageUrl,
      externalUrl: song.externalUrl,
    };
  }
  return shell;
}

async function loadPuzzle(date: string, tx: Tx | typeof db = db) {
  const rows = await tx
    .select({ puzzle: dailyPuzzles, song: songs })
    .from(dailyPuzzles)
    .innerJoin(songs, eq(songs.id, dailyPuzzles.songId))
    .where(eq(dailyPuzzles.date, date))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPuzzleNumberForDate(date: string): Promise<number | null> {
  const rows = await db
    .select({ puzzleNumber: dailyPuzzles.puzzleNumber })
    .from(dailyPuzzles)
    .where(eq(dailyPuzzles.date, date))
    .limit(1);
  return rows[0]?.puzzleNumber ?? null;
}

async function findAttempt(viewer: Viewer, puzzleId: string, tx: Tx | typeof db = db, lock = false) {
  const query = tx
    .select()
    .from(attempts)
    .where(and(eq(attempts.puzzleId, puzzleId), ownerFilter(viewer)))
    .limit(1);
  const rows = lock ? await query.for("update") : await query;
  return rows[0] ?? null;
}

export async function touchDevice(deviceId: string, tx: Tx | typeof db = db) {
  await tx
    .insert(userDevices)
    .values({ id: deviceId })
    .onConflictDoUpdate({ target: userDevices.id, set: { lastSeenAt: sql`now()` } });
}

export async function getPuzzleShell(viewer: Viewer, date: string): Promise<PuzzleShell | null> {
  const found = await loadPuzzle(date);
  if (!found) return null;
  const attempt = await findAttempt(viewer, found.puzzle.id);
  return buildShell(found.puzzle, found.song, attempt);
}

export async function submitGuess(
  viewer: Viewer,
  date: string,
  input: { songId: string | null; giveUp: boolean },
): Promise<PuzzleShell> {
  return db.transaction(async (tx) => {
    const found = await loadPuzzle(date, tx);
    if (!found) throw new GameError("NO_PUZZLE");
    const { puzzle, song } = found;

    let guessedTitle = "";
    if (!input.giveUp && input.songId) {
      const guessed = await tx.select({ title: songs.title }).from(songs).where(eq(songs.id, input.songId)).limit(1);
      if (!guessed[0]) throw new GameError("UNKNOWN_SONG");
      guessedTitle = guessed[0].title;
    }

    await touchDevice(viewer.deviceId, tx);
    // Create the row if needed, then lock it so concurrent submissions for
    // the same player serialize instead of losing updates.
    await tx
      .insert(attempts)
      .values({ puzzleId: puzzle.id, deviceId: viewer.deviceId, userId: viewer.userId })
      .onConflictDoNothing();
    const attempt = await findAttempt(viewer, puzzle.id, tx, true);
    if (!attempt) throw new Error("attempt row missing after insert");
    if (attempt.status !== "playing") throw new GameError("ALREADY_COMPLETED");

    const guess: GuessRecord = input.giveUp
      ? { kind: "giveup", songId: null, title: "Gave up", at: Date.now() }
      : !input.songId
        ? { kind: "skip", songId: null, title: "Skipped", at: Date.now() }
        : {
            kind: input.songId === puzzle.songId ? "correct" : "wrong",
            songId: input.songId,
            title: guessedTitle,
            at: Date.now(),
          };

    const state = nextState({ guesses: attempt.guesses as GuessRecord[] }, guess);
    const [updated] = await tx
      .update(attempts)
      .set({
        guesses: state.guesses,
        guessCount: state.guessCount,
        status: state.status,
        points: state.points,
        completedAt: state.status === "playing" ? null : new Date(),
      })
      .where(eq(attempts.id, attempt.id))
      .returning();

    return buildShell(puzzle, song, updated);
  });
}

// iTunes' CDN labels plain AAC previews `audio/x-m4p` (the DRM type), which
// browsers refuse to play; normalise to a type they accept.
function normalizeAudioContentType(upstreamType: string | null, url: string): string {
  if (upstreamType === "audio/x-m4p" || /\.m4a(\?|$)/.test(url)) return "audio/mp4";
  return upstreamType ?? "audio/mpeg";
}

const fullPreviewCache = new Map<string, { bytes: Uint8Array; mime: string }>();
const FULL_PREVIEW_CACHE_MAX = 32;

async function fetchFullPreview(url: string) {
  const cached = fullPreviewCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) return null;
  const entry = {
    bytes: new Uint8Array(await res.arrayBuffer()),
    mime: normalizeAudioContentType(res.headers.get("content-type"), url),
  };
  if (fullPreviewCache.size >= FULL_PREVIEW_CACHE_MAX) {
    fullPreviewCache.delete(fullPreviewCache.keys().next().value!);
  }
  fullPreviewCache.set(url, entry);
  return entry;
}

// Only the audio the viewer has unlocked is ever sent: while playing, the
// frames covering the current snippet; after the game, the full preview.
export async function getClip(viewer: Viewer, date: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const found = await loadPuzzle(date);
  if (!found) return null;
  const attempt = await findAttempt(viewer, found.puzzle.id);
  if (attempt && attempt.status !== "playing") {
    return fetchFullPreview(found.song.previewUrl);
  }
  const clip = await db
    .select({ bytes: puzzleClips.bytes, mime: puzzleClips.mime })
    .from(puzzleClips)
    .where(eq(puzzleClips.puzzleId, found.puzzle.id))
    .limit(1);
  if (!clip[0]) return null;
  const seconds = snippetSecondsFor(attempt?.guessCount ?? 0);
  return { bytes: sliceMp3ToSeconds(new Uint8Array(clip[0].bytes), seconds), mime: clip[0].mime };
}

// After sign-in, a guest's device attempts move to the account. Where the
// account already has an attempt for the same puzzle, the account's wins and
// the device copy is discarded.
export async function mergeDeviceIntoUser(deviceId: string, userId: string): Promise<number> {
  return db.transaction(async (tx) => {
    const owned = await tx.select({ puzzleId: attempts.puzzleId }).from(attempts).where(eq(attempts.userId, userId));
    const ownedIds = owned.map((r) => r.puzzleId);
    const guestRows = and(eq(attempts.deviceId, deviceId), isNull(attempts.userId));

    const moved = await tx
      .update(attempts)
      .set({ userId })
      .where(ownedIds.length ? and(guestRows, notInArray(attempts.puzzleId, ownedIds)) : guestRows)
      .returning({ id: attempts.id });
    if (ownedIds.length) {
      await tx.delete(attempts).where(and(guestRows, inArray(attempts.puzzleId, ownedIds)));
    }
    return moved.length;
  });
}
