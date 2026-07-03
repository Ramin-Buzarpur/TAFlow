import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listApplications, getTAOpportunity, getApplicantContext, readFormConfig } from "@/server/services/ta-workflow";
import { Topbar, EmptyState, Badge } from "@/components/ui";
import { ApplicantBoard } from "./ui";

export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای بررسی متقاضیان وارد شوید."/></main></>;
  const { id } = await params;
  const [opportunity, applications, applicantContext] = await Promise.all([
    getTAOpportunity(session.user.id, id),
    listApplications(session.user.id, { opportunityId: id, take: 100 }),
    getApplicantContext(session.user.id, id)
  ]);
  const formConfig = readFormConfig(opportunity.formConfigJson);
  return <><Topbar/><main className="shell">
    <div className="page-title">
      <div><h1>بررسی متقاضیان</h1><p className="muted">{opportunity.title} — {opportunity.courseOffering.course.title}</p></div>
      <div style={{ display: "flex", gap: 10 }}>
        <Badge tone="blue">{applications.length} متقاضی</Badge>
        <Link className="btn" href={`/opportunities/${id}/applicants/compare`}>مقایسه متقاضیان</Link>
        <Link className="btn" href={`/api/ta-opportunities/${id}/applications/export`}>خروجی اکسل</Link>
      </div>
    </div>
    {applications.length ? <ApplicantBoard
      formConfig={{ builtIn: formConfig?.builtIn ?? { studentNumber: false, gpa: false, priorGrade: false, resume: true }, customFields: formConfig?.customFields ?? [] }}
      applications={applications.map((a) => ({
        id: a.id,
        requestedRole: a.requestedRole,
        motivationText: a.motivationText,
        status: a.status,
        score: a.score !== null ? Number(a.score) : null,
        customFields: (a.customFieldsJson ?? {}) as Record<string, string | number>,
        context: applicantContext[a.applicantId] ?? { studentNumber: null, gpa: null, priorGrades: [] },
        applicant: {
          id: a.applicant.id,
          name: a.applicant.name,
          email: a.applicant.email,
          studentProfile: a.applicant.studentProfile ? { studentNumber: a.applicant.studentProfile.studentNumber, gpa: a.applicant.studentProfile.gpa !== null ? Number(a.applicant.studentProfile.gpa) : null } : null
        }
      }))}
    /> : <EmptyState title="متقاضی‌ای ثبت نشده" text="هنوز کسی برای این فرصت درخواست نداده است."/>}
  </main></>;
}
