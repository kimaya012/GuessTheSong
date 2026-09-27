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
  customType,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth-schema";

export * from "./auth-schema";

function timestamptzCol(name: string) {
  return timestamp(name, { withTimezone: true });
}

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

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
    previewSource: text("preview_source").notNull(), // 'deezer' | 'itunes'
    coverImageUrl: text("cover_image_url"),
    externalUrl: text("external_url"), // link to the full song on its source platform
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

// Pre-cut MP3 (first 9s, CBR 128k/48kHz) for each puzzle. The clip route
// serves only the frames covering the viewer's unlocked snippet length.
export const puzzleClips = pgTable("puzzle_clips", {
  puzzleId: uuid("puzzle_id")
    .primaryKey()
    .references(() => dailyPuzzles.id, { onDelete: "cascade" }),
  mime: text("mime").notNull().default("audio/mpeg"),
  bytes: bytea("bytes").notNull(),
  createdAt: timestamptzCol("created_at").notNull().defaultNow(),
});

export const userDevices = pgTable("user_devices", {
  id: uuid("id").primaryKey(),
  createdAt: timestamptzCol("created_at").notNull().defaultNow(),
  lastSeenAt: timestamptzCol("last_seen_at").notNull().defaultNow(),
});

// One row per player per puzzle. A guest's attempt is owned by their device
// (user_id NULL); once signed in, attempts are owned by the user.
export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    puzzleId: uuid("puzzle_id")
      .notNull()
      .references(() => dailyPuzzles.id),
    deviceId: uuid("device_id").references(() => userDevices.id),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    guesses: jsonb("guesses").notNull().default(sql`'[]'::jsonb`),
    guessCount: integer("guess_count").notNull().default(0),
    status: text("status", { enum: ["playing", "won", "lost"] }).notNull().default("playing"),
    points: integer("points").notNull().default(0),
    startedAt: timestamptzCol("started_at").notNull().defaultNow(),
    completedAt: timestamptzCol("completed_at"),
  },
  (table) => [
    uniqueIndex("attempts_user_puzzle_idx").on(table.userId, table.puzzleId),
    uniqueIndex("attempts_device_puzzle_guest_idx")
      .on(table.deviceId, table.puzzleId)
      .where(sql`${table.userId} IS NULL`),
    index("attempts_device_idx").on(table.deviceId),
    check("attempts_owner_check", sql`${table.deviceId} IS NOT NULL OR ${table.userId} IS NOT NULL`),
  ],
);

// Premium access. user_id is NULL while a paying supporter's email matches
// no verified account; it is attached on sign-up or email verification.
export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    source: text("source", { enum: ["bmc", "admin"] }).notNull(),
    externalRef: text("external_ref").notNull(),
    status: text("status", { enum: ["active", "cancelled", "expired"] }).notNull(),
    currentPeriodEnd: timestamptzCol("current_period_end").notNull(),
    createdAt: timestamptzCol("created_at").notNull().defaultNow(),
    updatedAt: timestamptzCol("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("entitlements_external_ref_idx").on(table.source, table.externalRef),
    index("entitlements_user_idx").on(table.userId),
    index("entitlements_email_idx").on(table.email),
  ],
);

// Extra emails a user has proven they own (e.g. the one they paid with on
// Buy Me a Coffee). Only a hash of the verification token is stored.
export const linkedEmails = pgTable(
  "linked_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash"),
    tokenExpiresAt: timestamptzCol("token_expires_at"),
    verifiedAt: timestamptzCol("verified_at"),
    createdAt: timestamptzCol("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("linked_emails_user_email_idx").on(table.userId, table.email),
    index("linked_emails_email_idx").on(table.email),
    uniqueIndex("linked_emails_token_idx").on(table.tokenHash),
  ],
);

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  receivedAt: timestamptzCol("received_at").notNull().defaultNow(),
  processedAt: timestamptzCol("processed_at"),
  error: text("error"),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    target: text("target"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamptzCol("created_at").notNull().defaultNow(),
  },
  (table) => [index("audit_log_created_idx").on(table.createdAt)],
);

// Fixed-window counters for our own (non-auth) endpoints.
export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").notNull(),
    windowStart: timestamptzCol("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
