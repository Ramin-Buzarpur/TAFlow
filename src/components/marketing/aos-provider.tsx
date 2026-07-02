"use client";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export function AosProvider() {
  useEffect(() => {
    AOS.init({
      duration: 500,
      once: true,
      disable: () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    });
  }, []);
  return null;
}
