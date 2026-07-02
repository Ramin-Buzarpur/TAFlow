"use client";
import { motion } from "motion/react";

type Pose = "idle" | "celebrate" | "point";

const ARMS: Record<Pose, { left: string; right: string }> = {
  idle: { left: "M70 120 Q55 135 60 155", right: "M130 120 Q145 135 140 155" },
  celebrate: { left: "M70 120 Q45 100 35 75", right: "M130 120 Q155 100 165 75" },
  point: { left: "M70 120 Q55 135 60 155", right: "M130 120 Q160 110 178 100" }
};

export function Mascot({ pose = "idle", size = 140, className }: { pose?: Pose; size?: number; className?: string }) {
  const arms = ARMS[pose];
  return (
    <motion.svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="var(--primary)"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* graduation cap */}
      <path d="M100 30 L145 48 L100 66 L55 48 Z" fill="var(--primary-2)" stroke="none" opacity={0.9} />
      <path d="M100 66 L100 84" />
      <circle cx="100" cy="88" r="3" fill="var(--primary-2)" stroke="none" />

      {/* head */}
      <circle cx="100" cy="110" r="38" fill="var(--card)" />
      {/* eyes */}
      <circle cx="88" cy="106" r="4" fill="var(--text)" stroke="none" />
      <circle cx="112" cy="106" r="4" fill="var(--text)" stroke="none" />
      {/* smile */}
      <path d={pose === "celebrate" ? "M85 120 Q100 135 115 120" : "M88 120 Q100 128 112 120"} />

      {/* body */}
      <path d="M65 175 Q65 145 100 145 Q135 145 135 175" fill="var(--card)" />
      {/* arms */}
      <path d={arms.left} />
      <path d={arms.right} />
    </motion.svg>
  );
}
