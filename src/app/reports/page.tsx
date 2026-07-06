import { Download, FileCheck2, TrendingUp, Users, CalendarClock, ShieldAlert } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { getManagementReport } from "@/server/services/reports";
import { Topbar, Card, EmptyState, Kpi, StatusBadge } from "@/components/ui";

function pct(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

export default async function ReportsPage() {
  const session = await auth();
  const isAdmin = session?.user?.globalRole === "SYSTEM_ADMIN" || session?.user?.globalRole === "EDUCATION_ADMIN";
  if (!session?.user?.id || !isAdmin) {
    return <><Topbar/><main className="shell"><EmptyState icon={ShieldAlert} title="دسترسی غیرمجاز" text="این بخش فقط برای ادمین سیستم و آموزش قابل مشاهده است."/></main></>;
  }

  const report = await getManagementReport(session.user.id);
  const maxApplications = Math.max(1, ...report.courseSummaries.map((course) => course.applications));

  return <><Topbar/><main className="shell">
    <div className="page-title">
      <div>
        <h1>گزارش‌ها و نمودارها</h1>
        <p className="muted">آمار مدیریتی تجمیعی از درخواست‌ها، نقش‌ها، جلسات و حضور در سطح درس.</p>
      </div>
      <a className="btn btn-primary" href="/api/reports/export">
        <Download size={16} />
        خروجی CSV
      </a>
    </div>

    <section className="grid grid-5">
      <Kpi icon={FileCheck2} label="کل درخواست‌های TA" value={report.totalApplications} />
      <Kpi icon={Users} label="TAهای فعال" value={report.activeTaAssignments} tone="purple" />
      <Kpi icon={Users} label="Head TAهای فعال" value={report.activeHeadTaAssignments} tone="orange" />
      <Kpi icon={CalendarClock} label="جلسات فعال" value={report.activeSessions} tone="green" />
      <Kpi icon={TrendingUp} label="نرخ حضور" value={pct(report.attendanceRate)} tone="green" />
    </section>

    <section className="grid grid-2" style={{ marginTop: 20 }}>
      <Card>
        <h2>وضعیت درخواست‌ها</h2>
        <div className="stack">
          {report.statusCounts.map((status) => <div className="list-row" key={status.status}><StatusBadge status={status.status}/><strong>{status.count}</strong></div>)}
        </div>
      </Card>
      <Card>
        <h2>رضایت استاد و TA</h2>
        <div className="stack">
          <div className="list-row"><span>رضایت استاد</span><strong>{report.professorSatisfaction.count} پاسخ</strong></div>
          <p className="muted">تدریس: {report.professorSatisfaction.averages.ratingTeaching?.toFixed(1) ?? "-"} / عدالت: {report.professorSatisfaction.averages.ratingFairness?.toFixed(1) ?? "-"} / منابع: {report.professorSatisfaction.averages.ratingResources?.toFixed(1) ?? "-"}</p>
          <div className="list-row"><span>رضایت TA</span><strong>{report.taSatisfaction.count} پاسخ</strong></div>
          <p className="muted">دانش: {report.taSatisfaction.averages.ratingKnowledge?.toFixed(1) ?? "-"} / پاسخ‌گویی: {report.taSatisfaction.averages.ratingAvailability?.toFixed(1) ?? "-"}</p>
        </div>
      </Card>
    </section>

    <section className="grid grid-2" style={{ marginTop: 20 }}>
      <Card>
        <h2>درس‌های با بیشترین درخواست</h2>
        <div className="stack">
          {report.topCourses.map((course) => (
            <div key={`${course.course}-${course.opportunity}`}>
              <div className="list-row" style={{ border: "none", padding: "4px 0" }}>
                <span>{course.course}</span>
                <strong>{course.applications}</strong>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
                <div style={{ width: `${(course.applications / maxApplications) * 100}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), var(--primary-2))" }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2>خلاصه درس‌ها</h2>
        <div className="stack">
          {report.courseSummaries.slice(0, 8).map((course) => (
            <div key={course.courseOfferingId} className="stack" style={{ gap: 8 }}>
              <div className="list-row" style={{ border: "none", padding: 0 }}>
                <div>
                  <strong>{course.course}</strong>
                  <p className="muted">{course.semester}</p>
                </div>
                <span className="muted">{course.applications} درخواست</span>
              </div>
              <div className="grid grid-4">
                <div className="list-row"><span>TA</span><strong>{course.activeTaAssignments}</strong></div>
                <div className="list-row"><span>Head TA</span><strong>{course.activeHeadTaAssignments}</strong></div>
                <div className="list-row"><span>جلسه</span><strong>{course.activeSessions}</strong></div>
                <div className="list-row"><span>حضور</span><strong>{course.attendanceRate === null ? "-" : `${course.attendanceRate}%`}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>

    <section className="grid grid-2" style={{ marginTop: 20 }}>
      <Card>
        <h2>خلاصه حضور</h2>
        <div className="stack">
          <div className="list-row"><span>ثبت‌نام‌ها</span><strong>{report.totalRegistrations}</strong></div>
          <div className="list-row"><span>حضور ثبت‌شده</span><strong>{report.attendedRegistrations}</strong></div>
          <div className="list-row"><span>جلسات</span><strong>{report.totalSessions}</strong></div>
        </div>
      </Card>
      <Card>
        <h2>گفت‌وگوها</h2>
        <div className="stack">
          <div className="list-row"><span>تعداد threadهای گفت‌وگو</span><strong>{report.totalThreads}</strong></div>
          <p className="muted">این شاخص هنوز به timeline و exportهای پیشرفته‌تر گسترش پیدا می‌کند.</p>
        </div>
      </Card>
    </section>
  </main></>;
}
