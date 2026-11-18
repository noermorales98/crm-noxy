"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** true mientras el elemento está en pantalla (para animar solo lo que se ve). */
export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/** true si la persona pidió menos movimiento (se suscribe al sistema, sin fijar estado dentro del efecto). */
export function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Cuenta de 0 a `steps` y vuelve a empezar, solo mientras `active`. Quieto (o con movimiento reducido)
 * devuelve `rest`, el estado que mejor explica la pantalla sin movimiento.
 */
export function useLoop(active: boolean, steps: number, rest: number, ms = 1100, pause = 2400) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  const running = active && !reduced;
  useEffect(() => {
    if (!running) return;
    let t = 0;
    let id: ReturnType<typeof setTimeout>;
    const run = () => {
      id = setTimeout(() => {
        t = t >= steps ? 0 : t + 1;
        setTick(t);
        run();
      }, t >= steps ? pause : ms);
    };
    run();
    return () => clearTimeout(id);
  }, [running, steps, ms, pause]);
  return running ? tick : rest;
}
