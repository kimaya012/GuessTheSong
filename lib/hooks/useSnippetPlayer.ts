"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { registerAnalyser, setAudioPlaying } from "@/components/stage/audio-reactive";

interface Options {
  src: string; // changes whenever the unlocked audio changes
  limitSeconds: number | null; // null = play the whole clip
}

export interface SnippetPlayer {
  status: "loading" | "ready" | "playing" | "error";
  progressSeconds: number;
  toggle: () => void;
}

// One <audio> element for the component's lifetime (a MediaElementSource
// can only be attached once), fed from a Blob of whatever the server
// unlocked, and routed through an AnalyserNode that drives the 3D stage.
export function useSnippetPlayer({ src, limitSeconds }: Options): SnippetPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const limitRef = useRef(limitSeconds);
  const [readySrc, setReadySrc] = useState<string | null>(null);
  const [errorSrc, setErrorSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progressSeconds, setProgress] = useState(0);

  const status: SnippetPlayer["status"] = playing
    ? "playing"
    : errorSrc === src
      ? "error"
      : readySrc === src
        ? "ready"
        : "loading";

  useEffect(() => {
    limitRef.current = limitSeconds;
  }, [limitSeconds]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setAudioPlaying(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    const controller = new AbortController();
    let objectUrl: string | null = null;

    fetch(src, { signal: controller.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`clip ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        audio.src = objectUrl;
        audio.load();
        setReadySrc(src);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setErrorSrc(src);
      });

    audio.addEventListener("ended", stop);
    return () => {
      controller.abort();
      audio.removeEventListener("ended", stop);
      stop();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, stop]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      setAudioPlaying(false);
      registerAnalyser(null);
      void ctxRef.current?.close();
    },
    [],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (status === "playing") {
      stop();
      return;
    }
    if (status !== "ready") return;

    // The AudioContext must be created inside a user gesture.
    if (!ctxRef.current) {
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        ctxRef.current = ctx;
        registerAnalyser(analyser);
      } catch {
        // No Web Audio: playback still works, the stage just won't dance.
      }
    }
    void ctxRef.current?.resume();

    const loop = () => {
      const limit = limitRef.current;
      if (limit !== null && audio.currentTime >= limit) {
        stop();
        return;
      }
      setProgress(audio.currentTime);
      rafRef.current = requestAnimationFrame(loop);
    };

    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        setPlaying(true);
        setAudioPlaying(true);
        rafRef.current = requestAnimationFrame(loop);
      })
      .catch(() => setErrorSrc(src));
  }, [status, stop, src]);

  return { status, progressSeconds, toggle };
}
