import { auth } from "@/server/auth/auth";
import { listTalentPool } from "@/server/services/ta-workflow";
import { Topbar, EmptyState, StatusBadge, Badge } from "@/components/ui";

export default async function TalentPoolPage() {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای مشاهده بانک استعدادها وارد شوید."/></main></>;
  const applications = await listTalentPool(session.user.id, { take: 50 });
  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>بانک استعدادها</h1><p className="muted">متقاضیانی که این ترم انتخاب نشده‌اند اما برای فرصت‌های آینده قابل بررسی هستند.</p></div></div>
    {applications.length ? <section className="grid grid-3">
      {applications.map((a) => <div className="card" key={a.id}>
        <div className="list-row" style={{ border: "none", padding: 0, marginBottom: 10 }}><strong>{a.applicant.name || a.applicant.email}</strong><StatusBadge status={a.status}/></div>
        <p className="muted">{a.applicant.studentProfile?.studentNumber} · معدل {a.applicant.studentProfile?.gpa != null ? String(a.applicant.studentProfile.gpa) : "-"}</p>
        <Badge tone="gray">{a.opportunity.courseOffering.course.title}</Badge>
        <p style={{ fontSize: 14, marginTop: 10 }}>{a.motivationText.slice(0, 140)}</p>
      </div>)}
    </section> : <EmptyState title="بانک استعدادها خالی است" text="هنوز متقاضی ردشده یا انصراف‌داده‌ای ثبت نشده است."/>}
  </main></>;
}
