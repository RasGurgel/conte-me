import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "book.music.enabled";
const BASE_GAIN = 0.18;
const DUCK_GAIN = 0.05;
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C major pentatonic

type Nodes = {
  ctx: AudioContext;
  master: GainNode;
  padGain: GainNode;
  melodyGain: GainNode;
  pad: OscillatorNode[];
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  melodyTimer: number | null;
};

export function useBackgroundMusic(active: boolean = true) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "true";
  });
  const userTouchedRef = useRef<boolean>(
    typeof window !== "undefined" && localStorage.getItem(KEY) !== null,
  );
  const nodesRef = useRef<Nodes | null>(null);

  const build = useCallback(() => {
    if (nodesRef.current) return nodesRef.current;
    const Ctx =
      (typeof window !== "undefined" &&
        (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) ||
      null;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    filter.connect(master);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    const padGain = ctx.createGain();
    padGain.gain.value = 0.7;
    padGain.connect(filter);

    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.value = 130.81; // C3
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 196.0 * 1.003; // G3 slight detune
    o1.connect(padGain);
    o2.connect(padGain);
    o1.start();
    o2.start();

    const melodyGain = ctx.createGain();
    melodyGain.gain.value = 0.25;
    melodyGain.connect(filter);

    const nodes: Nodes = {
      ctx,
      master,
      padGain,
      melodyGain,
      pad: [o1, o2],
      filter,
      lfo,
      lfoGain,
      melodyTimer: null,
    };
    nodesRef.current = nodes;
    return nodes;
  }, []);

  const scheduleMelody = useCallback(() => {
    const n = nodesRef.current;
    if (!n) return;
    const playNote = () => {
      const freq = PENTA[Math.floor(Math.random() * PENTA.length)];
      const now = n.ctx.currentTime;
      const osc = n.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const harm = n.ctx.createOscillator();
      harm.type = "sine";
      harm.frequency.value = freq * 2;
      const g = n.ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.35, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      osc.connect(g);
      harm.connect(g);
      g.connect(n.melodyGain);
      osc.start(now);
      harm.start(now);
      osc.stop(now + 1.5);
      harm.stop(now + 1.5);
      const next = 1600 + Math.random() * 1400;
      n.melodyTimer = window.setTimeout(playNote, next);
    };
    playNote();
  }, []);

  const fadeMaster = useCallback((target: number, dur = 1.2) => {
    const n = nodesRef.current;
    if (!n) return;
    const now = n.ctx.currentTime;
    n.master.gain.cancelScheduledValues(now);
    n.master.gain.setValueAtTime(n.master.gain.value, now);
    n.master.gain.linearRampToValueAtTime(target, now + dur);
  }, []);

  const start = useCallback(async () => {
    const n = build();
    if (!n) return;
    if (n.ctx.state === "suspended") await n.ctx.resume();
    if (!n.melodyTimer) scheduleMelody();
    fadeMaster(BASE_GAIN, 1.2);
  }, [build, scheduleMelody, fadeMaster]);

  const stop = useCallback(() => {
    const n = nodesRef.current;
    if (!n) return;
    fadeMaster(0, 0.6);
    if (n.melodyTimer) {
      clearTimeout(n.melodyTimer);
      n.melodyTimer = null;
    }
  }, [fadeMaster]);

  // react to enabled
  useEffect(() => {
    if (active && enabled) void start();
    else stop();
  }, [active, enabled, start, stop]);

  // cleanup
  useEffect(() => {
    return () => {
      const n = nodesRef.current;
      if (!n) return;
      if (n.melodyTimer) clearTimeout(n.melodyTimer);
      try {
        n.pad.forEach((o) => o.stop());
        n.lfo.stop();
        n.ctx.close();
      } catch {
        /* ignore */
      }
      nodesRef.current = null;
    };
  }, []);

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
    // do not persist — keep as "auto" so future sessions can re-arm
  }, []);

  const duck = useCallback(
    (on: boolean) => {
      const n = nodesRef.current;
      if (!n) return;
      const now = n.ctx.currentTime;
      const target = on ? DUCK_GAIN : BASE_GAIN;
      n.master.gain.cancelScheduledValues(now);
      n.master.gain.setValueAtTime(n.master.gain.value, now);
      n.master.gain.linearRampToValueAtTime(target, now + 0.4);
    },
    [],
  );

  return { enabled, toggle, armOnce, duck };
}
