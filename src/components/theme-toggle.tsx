"use client";

import { MoonStar, SunMedium } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label="تغییر حالت روشن و تاریک"
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <SunMedium size={16} className="theme-toggle__icon theme-toggle__icon--sun" />
        <MoonStar size={15} className="theme-toggle__icon theme-toggle__icon--moon" />
        <span className="theme-toggle__knob" />
      </span>
      <span className="theme-toggle__label">روز / شب</span>
    </button>
  );
}
