import { LayoutDashboard, Briefcase, BookOpen, UserRound, type LucideIcon } from "lucide-react";
import type { NavIconKey } from "./nav-links";

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  briefcase: Briefcase,
  book: BookOpen,
  profile: UserRound
};
