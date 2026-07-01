"use client";

export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return <button className="btn" onClick={toggle} aria-label="تغییر حالت روشن و تاریک" suppressHydrationWarning>🌓 حالت نمایش</button>;
}
