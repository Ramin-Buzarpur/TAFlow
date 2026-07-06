import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listTalentPool } from "@/server/services/ta-workflow";
import { Topbar, EmptyState, StatusBadge, Badge, Card, Kpi } from "@/components/ui";

type SearchParams = {
  q?: string | string[];
  status?: string | string[];
  sort?: string | string[];
};

const VIEWER_ROLES = new Set(["PROFESSOR", "EDUCATION_ADMIN", "SYSTEM_ADMIN"]);

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" });
}

function summarize(text: string, limit = 180) {
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

export default async function TalentPoolPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return <><Topbar /><main className="shell"><EmptyState title="ورود لازم است" text="برای مشاهده بانک استعدادها وارد شوید."/></main></>;
  }

  if (!VIEWER_ROLES.has(session.user.globalRole)) {
    return <><Topbar /><main className="shell"><EmptyState title="دسترسی محدود" text="بانک استعدادها فقط برای استادها و مدیران آموزشی قابل مشاهده است."/></main></>;
  }

  const params = await searchParams;
  const q = firstValue(params.q)?.trim() ?? "";
  const status = firstValue(params.status);
  const sortValue = firstValue(params.sort);
  const sort: "recent" | "score" | "course" = sortValue === "score" || sortValue === "course" ? sortValue : "recent";

  const applications = await listTalentPool(session.user.id, {
    q: q || undefined,
    status: status === "REJECTED" || status === "WITHDRAWN" ? status : undefined,
    sort,
    take: 50
  });

  const scoredCount = applications.filter((application) => application.score !== null).length;
  const rejectedCount = applications.filter((application) => application.status === "REJECTED").length;
  const withdrawnCount = applications.filter((application) => application.status === "WITHDRAWN").length;

  return <><Topbar /><main className="shell">
    <div className="page-title">
      <div>
        <h1>بانک استعدادها</h1>
        <p className="muted">کاندیداهای ردشده یا انصراف‌داده برای بررسی دوباره، جست‌وجو و انتخاب‌های آینده.</p>
      </div>
      <Badge tone="purple">{applications.length} نتیجه</Badge>
    </div>

    <section className="grid grid-4">
      <Kpi label="کل نتایج" value={applications.length} />
      <Kpi label="دارای امتیاز" value={scoredCount} tone="green" />
      <Kpi label="ردشده" value={rejectedCount} tone="orange" />
      <Kpi label="انصرافی" value={withdrawnCount} tone="orange" />
    </section>

    <Card style={{ marginTop: 20 }}>
      <form className="grid grid-4" method="get">
        <input className="input" name="q" defaultValue={q} placeholder="جست‌وجوی نام، ایمیل، درس یا متن انگیزه" />
        <select className="select" name="status" defaultValue={status ?? ""}>
          <option value="">همه وضعیت‌ها</option>
          <option value="REJECTED">ردشده</option>
          <option value="WITHDRAWN">انصراف‌داده</option>
        </select>
        <select className="select" name="sort" defaultValue={sort}>
          <option value="recent">جدیدترین</option>
          <option value="score">بالاترین امتیاز</option>
          <option value="course">بر اساس درس</option>
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" type="submit">اعمال</button>
          <Link className="btn" href="/talent-pool">پاک‌کردن</Link>
        </div>
      </form>
    </Card>

    {applications.length ? <section className="grid grid-2" style={{ marginTop: 20 }}>
      {applications.map((application) => (
        <div key={application.id} data-testid={`talent-pool-item-${application.id}`}>
          <Card>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ marginBottom: 6 }}>{application.applicant.name || application.applicant.email}</h2>
              <p className="muted">{application.applicant.email}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <StatusBadge status={application.status} />
              {application.score !== null ? <Badge tone="green">امتیاز {Number(application.score).toFixed(1)}</Badge> : <Badge tone="gray">بدون امتیاز</Badge>}
            </div>
          </div>

          <div className="stack" style={{ marginTop: 14 }}>
            <div className="list-row">
              <span>درس</span>
              <strong>{application.opportunity.courseOffering.course.title}</strong>
            </div>
            <div className="list-row">
              <span>فرصت</span>
              <strong>{application.opportunity.title}</strong>
            </div>
            <div className="list-row">
              <span>نقش درخواستی</span>
              <strong>{application.requestedRole}</strong>
            </div>
            <div className="list-row">
              <span>تاریخ</span>
              <strong>{formatDate(application.submittedAt)}</strong>
            </div>
            <div className="list-row">
              <span>شناسه دانشجو</span>
              <strong>{application.applicant.studentProfile?.studentNumber || "—"}</strong>
            </div>
            <div className="list-row">
              <span>معدل</span>
              <strong>{application.applicant.studentProfile?.gpa != null ? Number(application.applicant.studentProfile.gpa).toFixed(2) : "—"}</strong>
            </div>
          </div>

          <p style={{ marginTop: 14 }}>{summarize(application.motivationText)}</p>

          {application.rejectionReason ? <p className="muted">دلیل رد: {summarize(application.rejectionReason, 120)}</p> : null}

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <Link className="btn" href={`/opportunities/${application.opportunity.id}/applicants`}>مشاهده فرصت</Link>
            <Link className="btn" href={`/applications/${application.id}`}>جزئیات درخواست</Link>
          </div>
          </Card>
        </div>
      ))}
    </section> : <EmptyState title="نتیجه‌ای پیدا نشد" text="با این فیلترها هنوز candidateای در بانک استعدادها ثبت نشده است." />}
  </main></>;
}
