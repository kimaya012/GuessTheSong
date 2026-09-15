import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submitGuess } from "@/lib/puzzle-service";
import { isFutureDate, isValidDateString, resolveDateParam } from "@/lib/date";

const bodySchema = z.object({
  deviceId: z.string().uuid(),
  songId: z.string().uuid().nullable(),
  guessText: z.string().max(200).default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date: rawDate } = await params;
  const date = resolveDateParam(rawDate);

  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (isFutureDate(date)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const result = await submitGuess({ date, ...parsed.data });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status =
      message === "NO_PUZZLE_FOR_DATE"
        ? 404
        : message === "ALREADY_COMPLETED" || message === "NO_ATTEMPTS_LEFT"
          ? 409
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
