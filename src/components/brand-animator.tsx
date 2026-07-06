"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

const BRAND_FRAMES = ["TAFlow", "سامانه مدیریت دستیار آموزشی"];

export function BrandAnimator({ className }: { className?: string }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = BRAND_FRAMES[frameIndex];
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!deleting) {
      if (text === current) {
        timer = setTimeout(() => setDeleting(true), 1100);
      } else {
        timer = setTimeout(() => {
          setText(current.slice(0, text.length + 1));
        }, 75);
      }
    } else if (text.length === 0) {
      timer = setTimeout(() => {
        setDeleting(false);
        setFrameIndex((value) => (value + 1) % BRAND_FRAMES.length);
      }, 140);
    } else {
      timer = setTimeout(() => {
        setText(current.slice(0, text.length - 1));
      }, 34);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [deleting, frameIndex, text]);

  return (
    <span className={clsx("brand-animator", className)} aria-live="polite" aria-atomic="true">
      <span className="brand-animator__text">{text || "\u00A0"}</span>
      <span className="brand-animator__cursor" aria-hidden="true" />
    </span>
  );
}
