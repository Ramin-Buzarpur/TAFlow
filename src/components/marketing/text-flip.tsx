"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function TextFlip({ words, intervalMs = 2200 }: { words: string[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span style={{ position: "relative", display: "inline-block", minWidth: "9ch", verticalAlign: "bottom" }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ display: "inline-block", color: "var(--primary-2)" }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
