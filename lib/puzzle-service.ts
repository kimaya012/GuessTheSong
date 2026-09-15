import { db } from "@/lib/db";
import { dailyPuzzles, songs, attempts, userDevices, userStats } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { MAX_ATTEMPTS, hintsUnlockedForAttempt, snippetDurationForAttempt } from "@/lib/constants";

export interface PuzzleShell {
  puzzleNumber: number;
  date: string;
  maxAttempts: number;
  snippetDurationSec: number;
  revealedHints: Partial<Record<string, string | number | null>>;
  attemptsUsed: number;
  guesses: GuessRecord[];
  completed: boolean;
  won: boolean | null;
  answer?: {
    title: string;
    artist: string;
    album: string | null;
    year: number | null;
    genre: string | null;
    durationSec: number | null;
    coverImageUrl: string | null;
  };
}

export interface GuessRecord {
  songId: string;
  title: string;
  correct: boolean;
  attemptNumber: number;
  timestampMs: number;
}

export async function getPuzzleForDate(date: string) {
  const rows = await db
    .select()
    .from(dailyPuzzles)
    .where(eq(dailyPuzzles.date, date))
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureDevice(deviceId: string) {
  const existing = await db
    .select({ id: userDevices.id })
    .from(userDevices)
    .where(eq(userDevices.id, deviceId))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(userDevices).values({ id: deviceId });
  }
}

export async function getAttempt(deviceId: string, puzzleId: string) {
  const rows = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.deviceId, deviceId), eq(attempts.puzzleId, puzzleId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function buildPuzzleShell(
  date: string,
  deviceId: string | null,
): Promise<PuzzleShell | null> {
  const puzzle = await getPuzzleForDate(date);
  if (!puzzle) return null;

  const songRows = await db.select().from(songs).where(eq(songs.id, puzzle.songId)).limit(1);
  const song = songRows[0];
  if (!song) return null;

  const attempt = deviceId ? await getAttempt(deviceId, puzzle.id) : null;
  const guesses = (attempt?.guesses as GuessRecord[] | undefined) ?? [];
  const attemptsUsed = attempt?.attemptsUsed ?? 0;
  const completed = attempt?.completedAt != null;
  const won = attempt?.won ?? null;

  const currentAttemptNumber = Math.min(attemptsUsed + 1, MAX_ATTEMPTS);
  const unlockedKeys = hintsUnlockedForAttempt(currentAttemptNumber);

  const fullMetadata: Record<string, string | number | null> = {
    genre: song.genre,
    releaseYear: song.year,
    duration: song.durationSec,
    album: song.album,
    artist: song.artist,
  };

  const revealedHints: Partial<Record<string, string | number | null>> = {};
  for (const key of unlockedKeys) {
    revealedHints[key] = fullMetadata[key];
  }

  const shell: PuzzleShell = {
    puzzleNumber: puzzle.puzzleNumber,
    date: puzzle.date,
    maxAttempts: MAX_ATTEMPTS,
    snippetDurationSec: snippetDurationForAttempt(currentAttemptNumber),
    revealedHints,
    attemptsUsed,
    guesses,
    completed,
    won,
  };

  if (completed) {
    shell.answer = {
      title: song.title,
      artist: song.artist,
      album: song.album,
      year: song.year,
      genre: song.genre,
      durationSec: song.durationSec,
      coverImageUrl: song.coverImageUrl,
    };
  }

  return shell;
}

export async function submitGuess(params: {
  date: string;
  deviceId: string;
  songId: string | null; // null represents an explicit "skip"
  guessText: string;
}) {
  const puzzle = await getPuzzleForDate(params.date);
  if (!puzzle) throw new Error("NO_PUZZLE_FOR_DATE");

  await ensureDevice(params.deviceId);

  let attempt = await getAttempt(params.deviceId, puzzle.id);
  const guesses: GuessRecord[] = (attempt?.guesses as GuessRecord[] | undefined) ?? [];
  const attemptsUsedSoFar = attempt?.attemptsUsed ?? 0;

  if (attempt?.completedAt) {
    throw new Error("ALREADY_COMPLETED");
  }
  if (attemptsUsedSoFar >= MAX_ATTEMPTS) {
    throw new Error("NO_ATTEMPTS_LEFT");
  }

  const attemptNumber = attemptsUsedSoFar + 1;
  const correct = params.songId != null && params.songId === puzzle.songId;

  guesses.push({
    songId: params.songId ?? "",
    title: params.guessText,
    correct,
    attemptNumber,
    timestampMs: Date.now(),
  });

  const isLastAttempt = attemptNumber >= MAX_ATTEMPTS;
  const completed = correct || isLastAttempt;

  if (!attempt) {
    const inserted = await db
      .insert(attempts)
      .values({
        deviceId: params.deviceId,
        puzzleId: puzzle.id,
        guesses,
        attemptsUsed: attemptNumber,
        won: completed ? correct : null,
        completedAt: completed ? new Date() : null,
      })
      .returning();
    attempt = inserted[0];
  } else {
    const updated = await db
      .update(attempts)
      .set({
        guesses,
        attemptsUsed: attemptNumber,
        won: completed ? correct : null,
        completedAt: completed ? new Date() : null,
      })
      .where(eq(attempts.id, attempt.id))
      .returning();
    attempt = updated[0];
  }

  if (completed) {
    await updateStatsOnCompletion(params.deviceId, params.date, correct, attemptNumber);
  }

  const shell = await buildPuzzleShell(params.date, params.deviceId);
  return { correct, completed, shell };
}

async function updateStatsOnCompletion(
  deviceId: string,
  date: string,
  won: boolean,
  attemptNumber: number,
) {
  const existingRows = await db
    .select()
    .from(userStats)
    .where(eq(userStats.deviceId, deviceId))
    .limit(1);
  const existing = existingRows[0];

  const distributionIndex = won ? attemptNumber - 1 : 6; // index 6 = loss bucket

  if (!existing) {
    const distribution = [0, 0, 0, 0, 0, 0, 0];
    distribution[distributionIndex] += 1;
    await db.insert(userStats).values({
      deviceId,
      gamesPlayed: 1,
      gamesWon: won ? 1 : 0,
      currentStreak: won ? 1 : 0,
      maxStreak: won ? 1 : 0,
      guessDistribution: distribution,
      lastPlayedDate: date,
    });
    return;
  }

  const distribution = [...(existing.guessDistribution ?? [0, 0, 0, 0, 0, 0, 0])];
  distribution[distributionIndex] = (distribution[distributionIndex] ?? 0) + 1;

  const newStreak = won ? existing.currentStreak + 1 : 0;
  const newMaxStreak = Math.max(existing.maxStreak, newStreak);

  await db
    .update(userStats)
    .set({
      gamesPlayed: existing.gamesPlayed + 1,
      gamesWon: existing.gamesWon + (won ? 1 : 0),
      currentStreak: newStreak,
      maxStreak: newMaxStreak,
      guessDistribution: distribution,
      lastPlayedDate: date,
      updatedAt: new Date(),
    })
    .where(eq(userStats.deviceId, deviceId));
}
