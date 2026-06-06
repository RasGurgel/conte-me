import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "book.narration.enabled";

export function useNarration(currentAudioUrl?: string) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "true";
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;
    const onPlay = () => setIsPlaying(true);
    const onStop = () => setIsPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onStop);
    a.addEventListener("ended", onStop);
    return () => {
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onStop);
      a.removeEventListener("ended", onStop);
    };
  }, []);

  const playSrc = useCallback((url?: string) => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    if (!url) {
      setIsPlaying(false);
      return;
    }
    a.src = url;
    a.play().catch(() => setIsPlaying(false));
  }, []);

  // play current page when enabled or page changes
  useEffect(() => {
    if (!enabled) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (currentAudioUrl) playSrc(currentAudioUrl);
    else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [enabled, currentAudioUrl, playSrc]);

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v;
      localStorage.setItem(KEY, String(next));
      return next;
    });
  }, []);

  return { enabled, isPlaying, toggle, hasAudio: !!currentAudioUrl };
}
