import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { NAV_LINKS } from "./nav-links";
import { NAV_ICONS } from "./nav-icons";

// Re-exported for Server Components' convenience (import { Topbar, Card, ... }
// from "@/components/ui" in one line). Client Components must import these
// directly from "./primitives"/"./empty-state" instead — importing anything
// from this file, even a named re-export, evaluates Topbar's server-only
// auth/Prisma/Redis chain too, which breaks the client bundle.
export { EmptyState } from "./empty-state";
export { Card, Badge, Kpi, StatusBadge } from "./primitives";

// listTalentPool (src/server/services/ta-workflow.ts) restricts this page to
// PROFESSOR/EDUCATION_ADMIN/SYSTEM_ADMIN by global role. Showing the nav link
// to everyone else just leads to a dead-end "access denied" page.
const TALENT_POOL_ROLES = new Set(["PROFESSOR", "EDUCATION_ADMIN", "SYSTEM_ADMIN"]);

export async function Topbar() {
  const session = await auth();
  const user = session?.user;
  const links = user && TALENT_POOL_ROLES.has(user.globalRole) ? NAV_LINKS : NAV_LINKS.filter((l) => l.href !== "/talent-pool");
  return <header className="topbar"><div className="shell nav">
    <Link className="brand" href="/"><span className="logo"/><span>سامانه مدیریت دستیار آموزشی</span></Link>
    <nav className="navlinks">{links.map(({ href, label, icon }) => { const Icon = NAV_ICONS[icon]; return <Link href={href} key={href}><Icon size={16}/><span>{label}</span></Link>; })}</nav>
    <div className="actions">
      <ThemeToggle/>
      {user ? <NotificationBell/> : null}
      {user ? <UserMenu name={user.name ?? null} email={user.email ?? ""}/> : <>
        <Link className="btn" href="/register">ثبت‌نام</Link>
        <Link className="btn btn-primary" href="/login">ورود</Link>
      </>}
      <MobileNav links={links}/>
    </div>
  </div></header>;
}
