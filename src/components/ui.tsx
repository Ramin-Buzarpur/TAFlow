import Link from "next/link";
import { clsx } from "clsx";
import { Inbox, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "./nav-links";
import { NAV_ICONS } from "./nav-icons";

export function Topbar() {
  return <header className="topbar"><div className="shell nav">
    <Link className="brand" href="/"><span className="logo"/><span>سامانه مدیریت دستیار آموزشی</span></Link>
    <nav className="navlinks">{NAV_LINKS.map(({ href, label, icon }) => { const Icon = NAV_ICONS[icon]; return <Link href={href} key={href}><Icon size={16}/><span>{label}</span></Link>; })}</nav>
    <div className="actions">
      <ThemeToggle/>
      <Link className="btn" href="/dashboard">ورود به پنل</Link>
      <MobileNav links={NAV_LINKS}/>
    </div>
  </div></header>;
}

export function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) { return <section className={clsx("card", className)} style={style}>{children}</section>; }
export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "blue"|"green"|"red"|"orange"|"purple"|"gray" }) { return <span className={`badge b-${tone}`}>{children}</span>; }
export function Kpi({ label, value, tone = "blue", icon: Icon }: { label: string; value: React.ReactNode; tone?: "blue"|"green"|"orange"|"purple"; icon?: LucideIcon }) { return <Card><div className="kpi"><div><p className="muted">{label}</p><strong>{value}</strong></div><span className={`iconbox b-${tone}`}>{Icon ? <Icon size={20}/> : null}</span></div></Card>; }
export function EmptyState({ title, text, icon: Icon = Inbox }: { title: string; text: string; icon?: LucideIcon }) { return <div className="card empty-state"><Icon size={34} className="empty-state-icon"/><h3>{title}</h3><p className="muted">{text}</p></div>; }
export function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, "blue"|"green"|"red"|"orange"|"purple"|"gray"> = { SUBMITTED: "gray", UNDER_REVIEW: "blue", SHORTLISTED: "purple", INTERVIEW_INVITED: "orange", ACCEPTED: "green", REJECTED: "red", WITHDRAWN: "gray", PUBLISHED: "green", CLOSED: "gray", SCHEDULED: "blue", COMPLETED: "green", CANCELLED: "red", ISSUED: "green", PROFESSOR_APPROVED: "blue", SUBMITTED_CERT: "orange" };
  return <Badge tone={map[status || ""] || "gray"}>{status || "نامشخص"}</Badge>;
}
