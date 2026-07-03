import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listTAOpportunities } from "@/server/services/ta-workflow";
import { Topbar, Card, EmptyState, StatusBadge, Badge } from "@/components/ui";

// CREATE_TA_OPPORTUNITY (src/server/auth/permissions.ts) is only granted to
// these global roles; showing the button to everyone else led to a dead
// "/opportunities/new" click for students/TAs/Head TAs.
const CAN_CREATE_OPPORTUNITY_ROLES = new Set(["PROFESSOR", "EDUCATION_ADMIN", "SYSTEM_ADMIN"]);

export default async function OpportunitiesPage() {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای مشاهده فرصت‌های TA وارد شوید."/></main></>;
  const items = await listTAOpportunities(session.user.id, { openOnly: true, take: 50 });
  const canCreate = CAN_CREATE_OPPORTUNITY_ROLES.has(session.user.globalRole);
  return <><Topbar/><main className="shell"><div className="page-title"><div><h1>فرصت‌های TA و Head TA</h1><p className="muted">فهرست فرصت‌های فعال، مهلت ثبت‌نام و وضعیت بررسی.</p></div>{canCreate ? <Link href="/opportunities/new" className="btn btn-primary">ایجاد فرصت جدید</Link> : null}</div><section className="grid grid-3">{items.length ? items.map((o) => <Card key={o.id}><Badge tone={o.needsHeadTA ? "purple" : "blue"}>{o.needsHeadTA ? "Head TA + TA" : "TA"}</Badge><h2>{o.title}</h2><p className="muted">{o.courseOffering.course.title} — {o.courseOffering.semester.title}</p><p>{o.description.slice(0, 160)}</p><div className="list-row"><span>مهلت</span><strong>{new Date(o.deadline).toLocaleDateString("fa-IR")}</strong></div><div style={{ display:"flex", gap:10, marginTop:14 }}><Link className="btn btn-primary" href={`/opportunities/${o.id}`}>مشاهده و درخواست</Link><StatusBadge status={o.status}/></div></Card>) : <EmptyState title="فرصتی وجود ندارد" text="در حال حاضر فرصت فعالی منتشر نشده است."/>}</section></main></>;
}
