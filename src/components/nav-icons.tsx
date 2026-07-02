import { LayoutDashboard, Briefcase, MessageSquare, CalendarClock, ClipboardList, BarChart3, Star, Award, Users, Settings, type LucideIcon } from "lucide-react";
import type { NavIconKey } from "./nav-links";

export const NAV_ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  briefcase: Briefcase,
  message: MessageSquare,
  calendar: CalendarClock,
  clipboard: ClipboardList,
  chart: BarChart3,
  star: Star,
  award: Award,
  users: Users,
  settings: Settings
};
