import { MAX_GUESSES, type AttemptStatus, type GuessKind, type GuessRecord } from "./rules";

const SQUARE: Record<GuessKind, string> = {
  skip: "⬛",
  wrong: "🟥",
  correct: "🟩",
  giveup: "🏳️",
};
const UNUSED = "⬜";

export function buildShareText(input: {
  puzzleNumber: number;
  guesses: GuessRecord[];
  status: AttemptStatus;
  url: string;
  premium: boolean;
}): string {
  const squares = Array.from({ length: MAX_GUESSES }, (_, i) => {
    const guess = input.guesses[i];
    return guess ? SQUARE[guess.kind] : UNUSED;
  });
  const header = `#GuessTheBollySong #${input.puzzleNumber}${input.premium ? " 👑" : ""}`;
  return `${header}\n\n🔊 ${squares.join(" ")}\n\n${input.url}`;
}
