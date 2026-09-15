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

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = src;
    audioRef.current = audio;
    queueMicrotask(() => {
      setIsReady(false);
      setProgress(0);
    });

    const handleCanPlay = () => setIsReady(true);
    const handleTimeUpdate = () => {
      if (audio.currentTime >= snippetDurationSec) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        setProgress(0);
        return;
      }
      setProgress(Math.min(1, audio.currentTime / snippetDurationSec));
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("canplaythrough", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
