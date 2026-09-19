"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseSnippetPlayerOptions {
  src: string;
  snippetDurationSec: number;
}

interface UseSnippetPlayerResult {
  isPlaying: boolean;
  progress: number; // 0..1 within the current snippet
  isReady: boolean;
  play: () => void;
}

export function useSnippetPlayer({
  src,
  snippetDurationSec,
}: UseSnippetPlayerOptions): UseSnippetPlayerResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Kept in a ref (not just a closure over the prop) so the timeupdate
  // handler registered in the effect below always sees the latest snippet
  // duration, even though the effect itself only re-runs when `src` changes.
  const durationRef = useRef(snippetDurationSec);
  useEffect(() => {
    durationRef.current = snippetDurationSec;
  }, [snippetDurationSec]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const audio = new Audio();
    audioRef.current = audio;
    queueMicrotask(() => {
      setIsReady(false);
      setProgress(0);
    });

    const handleTimeUpdate = () => {
      const duration = durationRef.current;
      if (audio.currentTime >= duration) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        setProgress(0);
        return;
      }
      setProgress(Math.min(1, audio.currentTime / duration));
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    // Fetch the (small, ~1MB) preview clip as a blob and play it from an
    // object URL, rather than pointing the <audio> element's `src` directly
    // at the network endpoint. This sidesteps browser-specific quirks in
    // how <audio> elements negotiate range requests/preloading over the
    // network — the element only ever deals with fully-local data.
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load audio (${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        audio.src = objectUrl;
        setIsReady(true);
      })
      .catch(() => {
        if (!cancelled) setIsReady(false);
      });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      audioRef.current = null;
    };
  }, [src]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setProgress(0);
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, []);

  return { isPlaying, progress, isReady, play };
}
