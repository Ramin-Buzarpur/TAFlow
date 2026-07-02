import { FileCheck2, TrendingUp, MessagesSquare, GraduationCap, ShieldAlert } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { getManagementReport } from "@/server/services/reports";
import { Topbar, Card, EmptyState, Kpi, StatusBadge } from "@/components/ui";

export default async function ReportsPage() {
  const session = await auth();
  const isAdmin = session?.user?.globalRole === "SYSTEM_ADMIN" || session?.user?.globalRole === "EDUCATION_ADMIN";
  if (!session?.user?.id || !isAdmin) return <><Topbar/><main className="shell"><EmptyState icon={ShieldAlert} title="دسترسی غیرمجاز" text="این بخش فقط برای ادمین سیستم و آموزش قابل مشاهده است."/></main></>;
  const report = await getManagementReport(session.user.id);
  const maxApplications = Math.max(1, ...report.topCourses.map((c) => c.applications));

  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>گزارش‌ها و نمودارها</h1><p className="muted">آمار مدیریتی تجمیعی از درخواست‌ها، ارزشیابی‌ها و پیام‌رسانی.</p></div></div>

    <section className="grid grid-4">
      <Kpi icon={FileCheck2} label="کل درخواست‌های TA" value={report.totalApplications}/>
      <Kpi icon={TrendingUp} label="نرخ پذیرش" value={report.acceptanceRate !== null ? `${report.acceptanceRate}%` : "-"} tone="green"/>
      <Kpi icon={MessagesSquare} label="کل گفت‌وگوها" value={report.totalThreads} tone="purple"/>
      <Kpi icon={GraduationCap} label="ارزشیابی استاد ثبت‌شده" value={report.professorSatisfaction.count} tone="orange"/>
    </section>

    <section className="grid grid-2" style={{ marginTop: 20 }}>
      <Card>
        <h2>وضعیت درخواست‌ها</h2>
        <div className="stack">{report.statusCounts.map((s) => <div className="list-row" key={s.status}><StatusBadge status={s.status}/><strong>{s.count}</strong></div>)}</div>
      </Card>
      <Card>
        <h2>درس‌های با بیشترین درخواست</h2>
        <div className="stack">{report.topCourses.map((c, i) => <div key={i}>
          <div className="list-row" style={{ border: "none", padding: "4px 0" }}><span>{c.course}</span><strong>{c.applications}</strong></div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${(c.applications / maxApplications) * 100}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), var(--primary-2))" }}/></div>
        </div>)}</div>
      </Card>
      <Card>
        <h2>رضایت از استاد</h2>
        <p className="muted">{report.professorSatisfaction.count} پاسخ</p>
        <p>تدریس: {report.professorSatisfaction.averages.ratingTeaching?.toFixed(1) ?? "-"} / عدالت: {report.professorSatisfaction.averages.ratingFairness?.toFixed(1) ?? "-"} / منابع: {report.professorSatisfaction.averages.ratingResources?.toFixed(1) ?? "-"}</p>
      </Card>
      <Card>
        <h2>رضایت از TA</h2>
        <p className="muted">{report.taSatisfaction.count} پاسخ</p>
        <p>تسلط علمی: {report.taSatisfaction.averages.ratingKnowledge?.toFixed(1) ?? "-"} / پاسخ‌گویی: {report.taSatisfaction.averages.ratingAvailability?.toFixed(1) ?? "-"}</p>
      </Card>
    </section>
  </main></>;
}
