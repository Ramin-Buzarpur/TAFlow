import Link from "next/link";
import { clsx } from "clsx";
import { ThemeToggle } from "./theme-toggle";

export function Topbar() {
  const links = [
    ["/dashboard", "داشبورد"], ["/opportunities", "فرصت‌های TA"], ["/messages", "پیام‌ها"], ["/sessions", "رفع اشکال"], ["/grades", "نمرات"], ["/surveys", "نظرسنجی"], ["/evaluations/professor", "ارزشیابی استاد"], ["/certificates", "گواهی‌ها"], ["/talent-pool", "بانک استعدادها"], ["/settings", "تنظیمات"]
  ];
  return <header className="topbar"><div className="shell nav"><Link className="brand" href="/"><span className="logo"/><span>سامانه مدیریت دستیار آموزشی</span></Link><nav className="navlinks">{links.map(([href,label]) => <Link href={href} key={href}>{label}</Link>)}</nav><div className="actions"><ThemeToggle/><Link className="btn" href="/dashboard">ورود به پنل</Link></div></div></header>;
}

export function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) { return <section className={clsx("card", className)} style={style}>{children}</section>; }
export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "blue"|"green"|"red"|"orange"|"purple"|"gray" }) { return <span className={`badge b-${tone}`}>{children}</span>; }
export function Kpi({ label, value, tone = "blue" }: { label: string; value: string | number; tone?: "blue"|"green"|"orange"|"purple" }) { return <Card><div className="kpi"><div><p className="muted">{label}</p><strong>{value}</strong></div><span className={`iconbox b-${tone}`}/></div></Card>; }
export function EmptyState({ title, text }: { title: string; text: string }) { return <div className="card" style={{ textAlign: "center", padding: 36 }}><h3>{title}</h3><p className="muted">{text}</p></div>; }
export function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, "blue"|"green"|"red"|"orange"|"purple"|"gray"> = { SUBMITTED: "gray", UNDER_REVIEW: "blue", SHORTLISTED: "purple", INTERVIEW_INVITED: "orange", ACCEPTED: "green", REJECTED: "red", WITHDRAWN: "gray", PUBLISHED: "green", CLOSED: "gray", SCHEDULED: "blue", COMPLETED: "green", CANCELLED: "red", ISSUED: "green", PROFESSOR_APPROVED: "blue", SUBMITTED_CERT: "orange" };
  return <Badge tone={map[status || ""] || "gray"}>{status || "نامشخص"}</Badge>;
}
