"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { chooseListPlacement, type Placement } from "@/lib/ui/placement";
import type { CatalogSong } from "./types";

interface GuessInputProps {
  catalog: CatalogSong[];
  disabled: boolean;
  nextSnippetGain: number | null; // seconds a skip unlocks, null on the last guess
  onGuess: (song: CatalogSong) => void;
  onSkip: () => void;
  onGiveUp: () => void;
}

const ROW_HEIGHT = 64; // two-line option incl. padding
const MAX_RESULTS = 6;
const LIST_HEIGHT = ROW_HEIGHT * MAX_RESULTS + 12;
const HEADER_INSET = 72; // sticky header is 64px tall

// ARIA combobox: type to search, arrow keys to move, Enter to guess.
export function GuessInput({ catalog, disabled, nextSnippetGain, onGuess, onSkip, onGiveUp }: GuessInputProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [layout, setLayout] = useState<Placement>({ placement: "down", maxHeight: LIST_HEIGHT });
  const inputRef = useRef<HTMLInputElement>(null);

  // Opens on whichever side has room, and never under the footer.
  const updateLayout = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = chooseListPlacement({
      inputTop: rect.top,
      inputBottom: rect.bottom,
      viewportHeight: window.innerHeight,
      footerTop: document.querySelector("footer")?.getBoundingClientRect().top ?? null,
      listHeight: LIST_HEIGHT,
      gap: 8,
      topInset: HEADER_INSET,
    });
    setLayout((prev) => (prev.placement === next.placement && prev.maxHeight === next.maxHeight ? prev : next));
  }, []);

  // Keep the placement right while the list is open and the page moves.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updateLayout, { passive: true });
    window.addEventListener("resize", updateLayout);
    return () => {
      window.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
    };
  }, [open, updateLayout]);

  const fuse = useMemo(
    () => new Fuse(catalog, { keys: [{ name: "title", weight: 0.7 }, { name: "artist", weight: 0.3 }], threshold: 0.38, ignoreLocation: true }),
    [catalog],
  );
  const results = query.trim() ? fuse.search(query.trim(), { limit: MAX_RESULTS }).map((r) => r.item) : [];
  const showList = open && results.length > 0;

  function choose(song: CatalogSong) {
    onGuess(song);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    const move = (next: number) => {
      setActive(next);
      // The list can scroll when space is tight; keep the active option visible.
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    };
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move((active + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move((active - 1 + results.length) % results.length);
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
          ref={inputRef}
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
            updateLayout();
          }}
          onFocus={() => {
            setOpen(true);
            updateLayout();
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-13 w-full rounded-2xl bg-night/70 pl-11 pr-4 text-base text-foreground ring-1 ring-white/15 placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-marigold disabled:opacity-50"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            style={{ maxHeight: layout.maxHeight }}
            className={cn(
              "absolute z-30 w-full overflow-y-auto overscroll-contain rounded-2xl bg-popover p-1.5 shadow-2xl ring-1 ring-white/15",
              layout.placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
            )}
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
