import { auth } from "@/server/auth/auth";
import { rankApplications } from "@/server/services/scoring";
import { getTAOpportunity } from "@/server/services/ta-workflow";
import { Topbar, EmptyState, StatusBadge } from "@/components/ui";

export default async function CompareApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای مقایسه متقاضیان وارد شوید."/></main></>;
  const { id } = await params;
  const [opportunity, ranked] = await Promise.all([getTAOpportunity(session.user.id, id), rankApplications(session.user.id, id)]);

  if (!ranked.length) return <><Topbar/><main className="shell"><EmptyState title="متقاضی‌ای برای مقایسه نیست" text="هنوز درخواستی برای این فرصت ثبت نشده است."/></main></>;

  const rows: [string, (a: (typeof ranked)[number]) => React.ReactNode][] = [
    ["نام", (a) => a.applicant.name || a.applicant.email],
    ["شماره دانشجویی", (a) => a.applicant.studentProfile?.studentNumber || "-"],
    ["معدل", (a) => (a.applicant.studentProfile?.gpa ? Number(a.applicant.studentProfile.gpa).toFixed(2) : "-")],
    ["نقش درخواستی", (a) => a.requestedRole],
    ["امتیاز کل", (a) => (a.score !== null ? Number(a.score).toFixed(1) : "-")],
    ["تعداد بررسی", (a) => a.reviews.length],
    ["تعداد مصاحبه", (a) => a.interviews.length],
    ["وضعیت", (a) => <StatusBadge status={a.status}/>]
  ];

  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>مقایسه متقاضیان</h1><p className="muted">{opportunity.title} — {opportunity.courseOffering.course.title}</p></div></div>
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead><tr><th>معیار</th>{ranked.map((a) => <th key={a.id}>{a.applicant.name || a.applicant.email}</th>)}</tr></thead>
        <tbody>{rows.map(([label, render]) => <tr key={label}><td><strong>{label}</strong></td>{ranked.map((a) => <td key={a.id}>{render(a)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </main></>;
}
