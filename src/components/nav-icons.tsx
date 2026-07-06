import { LayoutDashboard, Briefcase, BookOpen, type LucideIcon } from "lucide-react";
import type { NavIconKey } from "./nav-links";

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  briefcase: Briefcase,
  book: BookOpen
};
