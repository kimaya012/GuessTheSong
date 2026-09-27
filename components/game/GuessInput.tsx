"use client";

import { useId, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogSong } from "./types";

interface GuessInputProps {
  catalog: CatalogSong[];
  disabled: boolean;
  nextSnippetGain: number | null; // seconds a skip unlocks, null on the last guess
  onGuess: (song: CatalogSong) => void;
  onSkip: () => void;
  onGiveUp: () => void;
}

// ARIA combobox: type to search, arrow keys to move, Enter to guess.
export function GuessInput({ catalog, disabled, nextSnippetGain, onGuess, onSkip, onGiveUp }: GuessInputProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const fuse = useMemo(
    () => new Fuse(catalog, { keys: [{ name: "title", weight: 0.7 }, { name: "artist", weight: 0.3 }], threshold: 0.38, ignoreLocation: true }),
    [catalog],
  );
  const results = query.trim() ? fuse.search(query.trim(), { limit: 6 }).map((r) => r.item) : [];
  const showList = open && results.length > 0;

  function choose(song: CatalogSong) {
    onGuess(song);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          aria-label="Search for the song"
          autoComplete="off"
          spellCheck={false}
          value={query}
          disabled={disabled}
          placeholder="Start typing a song title…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-13 w-full rounded-2xl bg-night/70 pl-11 pr-4 text-base text-foreground ring-1 ring-white/15 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-marigold disabled:opacity-50"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute bottom-full z-30 mb-2 w-full overflow-hidden rounded-2xl bg-popover p-1.5 shadow-2xl ring-1 ring-white/15 sm:bottom-auto sm:top-full sm:mb-0 sm:mt-2"
          >
            {results.map((song, i) => (
              <li
                key={song.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(song);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "cursor-pointer rounded-xl px-3.5 py-2.5",
                  i === active ? "bg-marigold/15 text-foreground" : "text-foreground/90",
                )}
              >
                <span className="block font-semibold">{song.title}</span>
                <span className="block text-sm text-muted-foreground">
                  {song.artist}
                  {song.album ? `, ${song.album}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="h-11 flex-1 rounded-full bg-white/8 px-4 text-sm font-bold text-foreground ring-1 ring-white/15 transition-colors hover:bg-white/12 disabled:opacity-50"
        >
          {nextSnippetGain ? `Skip (+${nextSnippetGain}s)` : "Skip last guess"}
        </button>
        <button
          type="button"
          onClick={onGiveUp}
          disabled={disabled}
          className="h-11 rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-rani disabled:opacity-50"
        >
          Give up
        </button>
      </div>
    </div>
  );
}
