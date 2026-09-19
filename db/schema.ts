import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

function timestamptzCol(name: string) {
  return timestamp(name, { withTimezone: true });
}

export const songs = pgTable(
  "songs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    titleNormalized: text("title_normalized").notNull(),
    artist: text("artist").notNull(),
    album: text("album"),
    year: integer("year"),
    genre: text("genre"),
    durationSec: integer("duration_sec"),
    deezerTrackId: text("deezer_track_id"),
    spotifyTrackId: text("spotify_track_id"),
    itunesTrackId: text("itunes_track_id"),
    previewUrl: text("preview_url").notNull(),
    previewSource: text("preview_source").notNull(), // 'deezer' | 'itunes' | 'spotify'
    coverImageUrl: text("cover_image_url"),
    externalUrl: text("external_url"), // link to listen to the full song on its source platform
    active: boolean("active").notNull().default(true),
    createdAt: timestamptzCol("created_at").notNull().defaultNow(),
    updatedAt: timestamptzCol("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("songs_deezer_track_id_idx").on(table.deezerTrackId),
    index("songs_title_normalized_idx").on(table.titleNormalized),
    index("songs_active_idx").on(table.active),
  ],
);

export const dailyPuzzles = pgTable(
  "daily_puzzles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    puzzleNumber: integer("puzzle_number").notNull(),
    date: date("date").notNull(),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id),
    createdAt: timestamptzCol("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_puzzles_puzzle_number_idx").on(table.puzzleNumber),
    uniqueIndex("daily_puzzles_date_idx").on(table.date),
  ],
);

export const userDevices = pgTable("user_devices", {
  id: uuid("id").primaryKey(),
  createdAt: timestamptzCol("created_at").notNull().defaultNow(),
  linkedUserId: uuid("linked_user_id"),
});

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => userDevices.id),
    puzzleId: uuid("puzzle_id")
      .notNull()
      .references(() => dailyPuzzles.id),
    guesses: jsonb("guesses").notNull().default(sql`'[]'::jsonb`),
    attemptsUsed: integer("attempts_used").notNull().default(0),
    currentScore: integer("current_score").notNull().default(10000),
    snippetDurationSec: integer("snippet_duration_sec").notNull().default(1),
    won: boolean("won"),
    completedAt: timestamptzCol("completed_at"),
    createdAt: timestamptzCol("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attempts_device_puzzle_idx").on(table.deviceId, table.puzzleId),
  ],
);

export const userStats = pgTable("user_stats", {
  deviceId: uuid("device_id")
    .primaryKey()
    .references(() => userDevices.id),
  gamesPlayed: integer("games_played").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  guessDistribution: integer("guess_distribution")
    .array()
    .notNull()
    .default(sql`'{0,0,0,0,0,0,0}'::integer[]`),
  totalPoints: integer("total_points").notNull().default(0),
  lastPlayedDate: date("last_played_date"),
  updatedAt: timestamptzCol("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamptzCol("created_at").notNull().defaultNow(),
});
