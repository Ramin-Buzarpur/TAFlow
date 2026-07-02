import Link from "next/link";
import { BookOpen, FileText, CalendarClock, Bell, MessageSquare, Clock, BarChart3, Users, ListChecks, Briefcase, Award } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { dashboardSummary, adminSummary, professorSummary, headTaSummary } from "@/server/services/dashboard";
import { Topbar, Card, EmptyState, Kpi, StatusBadge } from "@/components/ui";
import { CommandPalette } from "@/components/command-palette";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="برای مشاهده داشبورد وارد شوید" text="ابتدا حساب کاربری خود را بسازید یا وارد پنل شوید."/></main></>;
  const data = await dashboardSummary(session.user.id);
  const isAdmin = session.user.globalRole === "SYSTEM_ADMIN" || session.user.globalRole === "EDUCATION_ADMIN";
  const admin = isAdmin ? await adminSummary() : null;
  const professor = session.user.globalRole === "PROFESSOR" ? await professorSummary(session.user.id) : null;
  const headTa = await headTaSummary(session.user.id);
  const isHeadTa = headTa.offerings.length > 0;

  return <><Topbar/><CommandPalette/><main className="shell">
    <div className="page-title"><div><h1>داشبورد نقش‌محور</h1><p className="muted">خلاصه عملیات مهم، درخواست‌ها، جلسات و پیام‌های مرتبط با نقش شما.</p></div><Link className="btn btn-primary" href="/opportunities">فرصت‌های TA</Link></div>

    <section className="grid grid-5"><Kpi icon={BookOpen} label="درس‌های فعال من" value={data.counters.activeCourses}/><Kpi icon={FileText} label="درخواست‌های من" value={data.counters.applications} tone="purple"/><Kpi icon={CalendarClock} label="جلسات پیش‌رو" value={data.counters.upcomingSessions} tone="orange"/><Kpi icon={Bell} label="اعلان خوانده‌نشده" value={data.counters.unreadNotifications} tone="green"/><Kpi icon={MessageSquare} label="پیام خوانده‌نشده" value={data.counters.unreadMessages} tone="purple"/></section>

    {professor ? <><h2 style={{ marginTop: 30 }}>داشبورد استاد</h2>
      <section className="grid grid-4"><Kpi icon={BookOpen} label="درس‌های فعال" value={professor.counters.activeCourses}/><Kpi icon={Clock} label="درخواست‌های در انتظار" value={professor.counters.pendingApplications} tone="orange"/><Kpi icon={MessageSquare} label="پیام‌های باز" value={professor.counters.unansweredThreads} tone="purple"/><Kpi icon={BarChart3} label="نظرسنجی فعال" value={professor.counters.activeSurveys} tone="green"/></section>
      {professor.alerts.length ? <Card style={{ marginTop: 18 }}><h3>هشدارها</h3><div className="stack">{professor.alerts.map((a, i) => <div className="list-row" key={i}>{a}</div>)}</div></Card> : null}
      <section className="grid grid-3" style={{ marginTop: 18 }}>{professor.opportunities.map((o) => <Card key={o.id}><h3>{o.title}</h3><p className="muted">{o.courseOffering.course.title}</p><Link className="btn" href={`/opportunities/${o.id}/applicants`}>بررسی متقاضیان ({o._count.applications})</Link></Card>)}</section>
    </> : null}

    {isHeadTa ? <><h2 style={{ marginTop: 30 }}>داشبورد Head TA</h2>
      <section className="grid grid-4"><Kpi icon={BookOpen} label="درس‌های تحت مدیریت" value={headTa.counters.managedCourses}/><Kpi icon={Users} label="تعداد تیم TA" value={headTa.counters.teamSize} tone="purple"/><Kpi icon={ListChecks} label="وظایف باز" value={headTa.counters.openTasks} tone="orange"/><Kpi icon={MessageSquare} label="پیام‌های باز" value={headTa.counters.unansweredThreads} tone="green"/></section>
      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <Card><h3>تیم TA</h3><div className="stack">{headTa.team.map((t) => <div className="list-row" key={t.id}><span>{t.user.name}</span><span className="muted">{t.courseOffering.course.title}</span></div>)}</div></Card>
        <Card><h3>وظایف باز</h3><div className="stack">{headTa.tasks.length ? headTa.tasks.map((t) => <div className="list-row" key={t.id}><span>{t.title}</span><StatusBadge status={t.status}/></div>) : <p className="muted">وظیفه‌ای باز نیست.</p>}</div></Card>
      </section>
    </> : null}

    {admin ? <><h2 style={{ marginTop: 30 }}>داشبورد ادمین</h2><section className="grid grid-4"><Kpi icon={Users} label="کل کاربران" value={admin.users}/><Kpi icon={BookOpen} label="ارائه‌های درس" value={admin.offerings}/><Kpi icon={Briefcase} label="فرصت‌های فعال" value={admin.opportunities}/><Kpi icon={Award} label="گواهی در انتظار" value={admin.certificates}/></section><div style={{ display:"flex", gap:10, marginTop:16 }}><Link className="btn" href="/admin">پنل مدیریت</Link><Link className="btn" href="/reports">گزارش‌ها و نمودارها</Link></div></> : null}

    <section className="grid grid-3" style={{ marginTop:24 }}><Card><h2>درخواست‌های اخیر</h2><div className="stack">{data.myApplications.length ? data.myApplications.map((a) => <Link className="list-row" href={`/applications/${a.id}`} key={a.id}><div><strong>{a.opportunity.title}</strong><p className="muted">{a.opportunity.courseOffering.course.title}</p></div><StatusBadge status={a.status}/></Link>) : <p className="muted">درخواستی ثبت نشده است.</p>}</div></Card><Card><h2>جلسات آینده</h2><div className="stack">{data.sessions.map((s) => <Link className="list-row" href={`/sessions/${s.id}`} key={s.id}><div><strong>{s.title}</strong><p className="muted">{s.courseOffering.course.title}</p></div><StatusBadge status={s.status}/></Link>)}</div></Card><Card><h2>اعلان‌ها</h2><div className="stack">{data.announcements.map((a) => <div className="list-row" key={a.id}><div><strong>{a.title}</strong><p className="muted">{a.priority}</p></div></div>)}</div></Card></section>
  </main></>;
}
