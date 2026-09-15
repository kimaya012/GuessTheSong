"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CatalogSong } from "./types";

interface GuessInputProps {
  catalog: CatalogSong[];
  disabled: boolean;
  onGuess: (song: CatalogSong) => void;
  onSkip: () => void;
}

export function GuessInput({ catalog, disabled, onGuess, onSkip }: GuessInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const fuse = useMemo(
    () =>
      new Fuse(catalog, {
        keys: ["title", "artist"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [catalog],
  );

  const results = query.trim().length > 0 ? fuse.search(query, { limit: 6 }) : [];

  function handleSelect(song: CatalogSong) {
    onGuess(song);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          value={query}
          disabled={disabled}
          placeholder="Guess the song title..."
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <Button variant="secondary" disabled={disabled} onClick={onSkip}>
          Skip
        </Button>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
          {results.map(({ item }) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => handleSelect(item)}
              >
                <span className="font-medium">{item.title}</span>{" "}
                <span className="text-muted-foreground">— {item.artist}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
