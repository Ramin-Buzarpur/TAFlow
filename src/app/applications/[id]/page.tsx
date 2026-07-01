import { auth } from "@/server/auth/auth";
import { getApplication } from "@/server/services/ta-workflow";
import { Topbar, Card, EmptyState, StatusBadge } from "@/components/ui";
import { ApplicationActions } from "./ui";
export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای مشاهده درخواست وارد شوید."/></main></>;
  const { id } = await params; const app = await getApplication(session.user.id, id);
  return <><Topbar/><main className="shell"><div className="page-title"><div><h1>جزئیات درخواست</h1><p className="muted">{app.opportunity.title}</p></div><StatusBadge status={app.status}/></div><section className="grid grid-2"><Card><h2>متقاضی</h2><p><strong>{app.applicant.name || app.applicant.email}</strong></p><p className="muted">{app.applicant.studentProfile?.studentNumber}</p><h3>انگیزه‌نامه</h3><p>{app.motivationText}</p></Card><Card><h2>اقدامات بررسی</h2><ApplicationActions id={app.id}/><div className="stack" style={{ marginTop:18 }}>{app.interviews.map((i) => <div className="list-row" key={i.id}><span>{new Date(i.startsAt).toLocaleString("fa-IR")}</span><StatusBadge status={i.status}/></div>)}</div></Card></section></main></>;
}
