import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { NAV_LINKS } from "./nav-links";
import { NAV_ICONS } from "./nav-icons";

// Re-exported for Server Components' convenience (import { Topbar, Card, ... }
// from "@/components/ui" in one line). Client Components must import these
// directly from "./primitives"/"./empty-state" instead — importing anything
// from this file, even a named re-export, evaluates Topbar's server-only
// auth/Prisma/Redis chain too, which breaks the client bundle.
export { EmptyState } from "./empty-state";
export { Card, Badge, Kpi, StatusBadge } from "./primitives";

export async function Topbar() {
  const session = await auth();
  const user = session?.user;
  return <header className="topbar"><div className="shell nav">
    <Link className="brand" href="/"><span className="logo"/><span>سامانه مدیریت دستیار آموزشی</span></Link>
    <nav className="navlinks">{NAV_LINKS.map(({ href, label, icon }) => { const Icon = NAV_ICONS[icon]; return <Link href={href} key={href}><Icon size={16}/><span>{label}</span></Link>; })}</nav>
    <div className="actions">
      <ThemeToggle/>
      {user ? <UserMenu name={user.name ?? null} email={user.email ?? ""}/> : <>
        <Link className="btn" href="/register">ثبت‌نام</Link>
        <Link className="btn btn-primary" href="/login">ورود</Link>
      </>}
      <MobileNav links={NAV_LINKS}/>
    </div>
  </div></header>;
}
