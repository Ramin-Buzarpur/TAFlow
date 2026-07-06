export type NavIconKey = "dashboard" | "briefcase" | "book";

export type NavLink = { href: string; label: string; icon: NavIconKey };

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "داشبورد", icon: "dashboard" },
  { href: "/opportunities", label: "فرصت‌ها", icon: "briefcase" },
  { href: "/courses", label: "درس‌ها", icon: "book" }
];
