export type NavIconKey = "dashboard" | "briefcase" | "message" | "calendar" | "clipboard" | "chart" | "star" | "award" | "users" | "settings";
export type NavLink = { href: string; label: string; icon: NavIconKey };

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "داشبورد", icon: "dashboard" },
  { href: "/opportunities", label: "فرصت‌های TA", icon: "briefcase" },
  { href: "/messages", label: "پیام‌ها", icon: "message" },
  { href: "/sessions", label: "رفع اشکال", icon: "calendar" },
  { href: "/grades", label: "نمرات", icon: "clipboard" },
  { href: "/surveys", label: "ارزیابی‌ها", icon: "chart" },
  { href: "/evaluations/professor", label: "ارزشیابی استاد", icon: "star" },
  { href: "/certificates", label: "گواهی‌ها", icon: "award" },
  { href: "/talent-pool", label: "بانک استعدادها", icon: "users" },
  { href: "/settings", label: "تنظیمات", icon: "settings" }
];
