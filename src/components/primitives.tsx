import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export function Card({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) { return <section className={clsx("card", className)} style={style}>{children}</section>; }
export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "blue"|"green"|"red"|"orange"|"purple"|"gray" }) { return <span className={`badge b-${tone}`}>{children}</span>; }
export function Kpi({ label, value, tone = "blue", icon: Icon }: { label: string; value: React.ReactNode; tone?: "blue"|"green"|"orange"|"purple"; icon?: LucideIcon }) { return <Card><div className="kpi"><div><p className="muted">{label}</p><strong>{value}</strong></div><span className={`iconbox b-${tone}`}>{Icon ? <Icon size={20}/> : null}</span></div></Card>; }
export function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, "blue"|"green"|"red"|"orange"|"purple"|"gray"> = { SUBMITTED: "gray", UNDER_REVIEW: "blue", SHORTLISTED: "purple", INTERVIEW_INVITED: "orange", ACCEPTED: "green", REJECTED: "red", WITHDRAWN: "gray", PUBLISHED: "green", CLOSED: "gray", SCHEDULED: "blue", COMPLETED: "green", CANCELLED: "red", ISSUED: "green", PROFESSOR_APPROVED: "blue", SUBMITTED_CERT: "orange" };
  return <Badge tone={map[status || ""] || "gray"}>{status || "نامشخص"}</Badge>;
}
