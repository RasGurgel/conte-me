import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "book.music.enabled";

export function useStorySoundtrack(
  url: string | null | undefined,
  baseVolume = 0.18,
  active: boolean = true,
) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "true";
  });
  const userTouchedRef = useRef<boolean>(
    typeof window !== "undefined" && localStorage.getItem(KEY) !== null,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const duckedRef = useRef(false);

  // build audio element when url changes
  useEffect(() => {
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    if (!url) return;
    const a = new Audio(url);
    a.loop = true;
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.volume = 0;
    audioRef.current = a;
    return () => {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
      if (audioRef.current === a) audioRef.current = null;
    };
  }, [url]);

  const targetVolume = useCallback(
    () => (duckedRef.current ? baseVolume * 0.3 : baseVolume),
    [baseVolume],
  );

  const fadeTo = useCallback((target: number, dur = 800) => {
    const a = audioRef.current;
    if (!a) return;
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
    const start = a.volume;
    const startTime = performance.now();
    fadeRef.current = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - startTime) / dur);
      a.volume = Math.max(0, Math.min(1, start + (target - start) * t));
      if (t >= 1 && fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    }, 30);
  }, []);

  const start = useCallback(async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      await a.play();
      fadeTo(targetVolume(), 1200);
    } catch (e) {
      console.warn("soundtrack play blocked", e);
    }
  }, [fadeTo, targetVolume]);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    fadeTo(0, 600);
    window.setTimeout(() => {
      try {
        a.pause();
      } catch {
        /* ignore */
      }
    }, 650);
  }, [fadeTo]);

  useEffect(() => {
    if (active && enabled) void start();
    else stop();
  }, [active, enabled, start, stop]);

  const toggle = useCallback(() => {
    userTouchedRef.current = true;
    setEnabled((v) => {
      const next = !v;
      localStorage.setItem(KEY, String(next));
      window.dispatchEvent(new CustomEvent("book-music-change", { detail: next }));
      return next;
    });
  }, []);

  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<boolean>).detail;
      setEnabled(next);
    };
    window.addEventListener("book-music-change", onChange);
    return () => window.removeEventListener("book-music-change", onChange);
  }, []);

  const armOnce = useCallback(() => {
    if (userTouchedRef.current) return;
    setEnabled(true);
  }, []);

  const duck = useCallback(
    (on: boolean) => {
      duckedRef.current = on;
      if (audioRef.current && !audioRef.current.paused) {
        fadeTo(on ? baseVolume * 0.3 : baseVolume, 400);
      }
    },
    [baseVolume, fadeTo],
  );

  return { enabled, toggle, armOnce, duck, hasTrack: !!url };
}
