"use client";
import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

export function AnimatedCounter({ to, suffix = "", durationMs = 1200 }: { to: number; suffix?: string; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveDuration = reduced ? 0 : durationMs;
    const start = performance.now();
    let frame: number;
    function tick(now: number) {
      const progress = effectiveDuration === 0 ? 1 : Math.min(1, (now - start) / effectiveDuration);
      setValue(Math.round(to * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, durationMs]);

  return <span ref={ref}>{value.toLocaleString("fa-IR")}{suffix}</span>;
}
