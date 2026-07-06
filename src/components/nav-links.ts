export type NavIconKey = "dashboard" | "briefcase" | "book";

export type NavSubLink = {
  href: string;
  label: string;
  description: string;
  allowedGlobalRoles?: string[];
};

export type NavLink = {
  href: string;
  label: string;
  icon: NavIconKey;
  children?: NavSubLink[];
};

export const NAV_LINKS: NavLink[] = [
  {
    href: "/dashboard",
    label: "داشبورد",
    icon: "dashboard",
    children: [
      { href: "/dashboard", label: "نمای کلی", description: "اعلان‌ها، آمار سریع و کارهای روز" }
    ]
  },
  {
    href: "/opportunities",
    label: "فرصت‌ها",
    icon: "briefcase",
    children: [
      { href: "/opportunities", label: "همه فرصت‌ها", description: "مشاهده و درخواست برای فرصت‌های TA" },
      { href: "/opportunities/applications", label: "درخواست‌های من", description: "پیگیری وضعیت درخواست‌های ارسال‌شده" },
      {
        href: "/opportunities/new",
        label: "ایجاد فرصت",
        description: "انتشار فرصت همکاری برای یک درس",
        allowedGlobalRoles: ["PROFESSOR", "EDUCATION_ADMIN", "SYSTEM_ADMIN"]
      }
    ]
  },
  {
    href: "/courses",
    label: "درس‌ها",
    icon: "book",
    children: [
      { href: "/courses", label: "درس‌های من", description: "ورود به پنل درس‌های فعال" },
      { href: "/sessions", label: "جلسات رفع اشکال", description: "زمان‌بندی، صف سوالات و حضور" },
      { href: "/grades", label: "نمرات و بازبینی", description: "نمرات منتشرشده و درخواست تجدیدنظر" },
      { href: "/files", label: "فایل‌ها", description: "دسترسی امن به فایل‌های درسی" }
    ]
  }
];

export function navLinksForRole(role?: string | null) {
  return NAV_LINKS.map((link) => ({
    ...link,
    children: link.children?.filter((child) => !child.allowedGlobalRoles || (role && child.allowedGlobalRoles.includes(role)))
  }));
}
