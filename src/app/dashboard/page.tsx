import Link from "next/link";
import { ArrowLeft, Bell, BookOpen, Briefcase, CalendarClock, FileText, ListChecks, Sparkles, Users } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { dashboardSummary, taSummary } from "@/server/services/dashboard";
import { Badge, Card, Kpi, StatusBadge, Topbar } from "@/components/ui";
import { DeliverableSubmit } from "@/components/deliverable-submit";
import { Mascot } from "@/components/marketing/mascot";

type CourseContext = {
  id: string;
  title: string;
  code: string;
  semester: string;
  section: string | null;
  professor: string;
  roles: Set<string>;
  status: string;
};

function buildCourseContexts(myRoles: Array<{ role: string; courseOffering: { id: string; status: string; section: string | null; course: { title: string; code: string }; semester: { title: string }; professor: { name: string | null; email: string } } }>): CourseContext[] {
  const grouped = new Map<string, CourseContext>();
  for (const row of myRoles) {
    const existing = grouped.get(row.courseOffering.id);
    if (existing) {
      existing.roles.add(row.role);
      continue;
    }
    grouped.set(row.courseOffering.id, {
      id: row.courseOffering.id,
      title: row.courseOffering.course.title,
      code: row.courseOffering.course.code,
      semester: row.courseOffering.semester.title,
      section: row.courseOffering.section,
      professor: row.courseOffering.professor.name || row.courseOffering.professor.email,
      roles: new Set([row.role]),
      status: row.courseOffering.status
    });
  }
  return Array.from(grouped.values());
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <div className="dashboard-empty">
            <h1>برای مشاهده داشبورد وارد شوید</h1>
            <p className="muted">ابتدا حساب کاربری خود را بسازید یا وارد پنل شوید.</p>
          </div>
        </main>
      </>
    );
  }

  const data = await dashboardSummary(session.user.id);
  const ta = await taSummary(session.user.id);
  const courses = buildCourseContexts(data.myRoles);
  const unreadNotifications = data.notifications.filter((n) => !n.readAt);

  return (
    <>
      <Topbar />
      <main className="dashboard-shell">
        <section className="dashboard-band dashboard-band--hero">
          <div className="dashboard-band__pattern dashboard-band__pattern--hero" aria-hidden="true" />
          <div className="shell dashboard-hero">
            <div className="dashboard-hero__copy">
              <Badge tone="blue">نمای کلی</Badge>
              <div className="dashboard-hero__heading">
                <h1>خلاصه‌ی روز شما در یک نگاه</h1>
                <p>
                  فرصت‌ها، درس‌ها، جلسه‌ها، اعلان‌ها و کارهای جاری را یکجا ببینید و مستقیم به بخش موردنظر بروید.
                </p>
              </div>

              <div className="dashboard-hero__actions">
                <Link className="btn btn-primary" href="/opportunities">
                  فرصت‌ها
                  <ArrowLeft size={16} />
                </Link>
                <Link className="btn" href="/courses">
                  درس‌ها
                </Link>
              </div>

              <div className="dashboard-hero__chips">
                <span>Course-centric</span>
                <span>RBAC</span>
                <span>2FA</span>
                <span>Audit Log</span>
              </div>
            </div>

            <div className="dashboard-hero__visual">
              <div className="dashboard-hero-card">
                <div className="dashboard-hero-card__top">
                  <div>
                    <p className="dashboard-kicker">وضعیت امروز</p>
                    <strong>یک نمای سریع، منظم و عملیاتی</strong>
                  </div>
                  <Badge tone="purple">Live</Badge>
                </div>

                <div className="dashboard-hero-card__grid">
                  <div className="dashboard-hero-stat">
                    <span className="dashboard-hero-stat__icon"><BookOpen size={18} /></span>
                    <div><strong>{data.counters.activeCourses}</strong><span>درس‌های فعال</span></div>
                  </div>
                  <div className="dashboard-hero-stat">
                    <span className="dashboard-hero-stat__icon"><Bell size={18} /></span>
                    <div><strong>{unreadNotifications.length}</strong><span>اعلان‌های خوانده‌نشده</span></div>
                  </div>
                  <div className="dashboard-hero-stat">
                    <span className="dashboard-hero-stat__icon"><CalendarClock size={18} /></span>
                    <div><strong>{data.counters.upcomingSessions}</strong><span>جلسه‌های پیش‌رو</span></div>
                  </div>
                  <div className="dashboard-hero-stat">
                    <span className="dashboard-hero-stat__icon"><Users size={18} /></span>
                    <div><strong>{courses.length}</strong><span>درس‌های قابل دسترسی</span></div>
                  </div>
                </div>

                <div className="dashboard-hero-card__scene">
                  <div className="dashboard-hero-card__scene-copy">
                    <span className="dashboard-kicker">جریان کار</span>
                    <strong>فرصت‌ها و درس‌ها از همین‌جا شروع می‌شوند</strong>
                    <p>هر درس صفحه‌ی مستقل خود را دارد و بخش‌های تیم، وظایف، جلسات، نمره‌ها و فایل‌ها همان‌جا مدیریت می‌شوند.</p>
                  </div>
                  <Mascot pose="point" size={180} className="dashboard-hero-mascot" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-band dashboard-band--kpis">
          <div className="dashboard-band__pattern dashboard-band__pattern--kpis" aria-hidden="true" />
          <div className="shell">
            <div className="dashboard-section-head">
              <div>
                <Badge tone="blue">خلاصه فوری</Badge>
                <h2>چند شاخص کلیدی برای شروع سریع</h2>
              </div>
              <p>این کارت‌ها برای تصمیم‌گیری سریع طراحی شده‌اند، نه برای نمایشِ داده‌ی اضافی.</p>
            </div>

            <div className="dashboard-kpi-grid">
              <Kpi icon={BookOpen} label="درس‌های فعال" value={data.counters.activeCourses} />
              <Kpi icon={FileText} label="درخواست‌های من" value={data.counters.applications} tone="purple" />
              <Kpi icon={CalendarClock} label="جلسه‌های پیش‌رو" value={data.counters.upcomingSessions} tone="orange" />
              <Kpi icon={Bell} label="اعلان‌های جدید" value={unreadNotifications.length} tone="green" />
              <Kpi icon={ListChecks} label="وظایف باز من" value={ta.counters.myOpenTasks} tone="purple" />
            </div>
          </div>
        </section>

        <section className="dashboard-band dashboard-band--workspace">
          <div className="dashboard-band__pattern dashboard-band__pattern--workspace" aria-hidden="true" />
          <div className="shell">
            <div className="dashboard-section-head dashboard-section-head--split">
              <div>
                <Badge tone="purple">درس‌های من</Badge>
                <h2>ورودی مستقیم به هر درس</h2>
              </div>
              <p>همه‌ی ابزارهای عملیاتی داخل صفحه‌ی درس قرار دارند و از همین‌جا قابل ورود هستند.</p>
            </div>

            <div className="dashboard-workspace-grid">
              {courses.length ? courses.map((course) => (
                <Card className="dashboard-panel" key={course.id}>
                  <div className="dashboard-panel__head">
                    <div>
                      <h3>{course.title}</h3>
                      <p className="muted">{course.code} · {course.semester}{course.section ? ` · بخش ${course.section}` : ""}</p>
                    </div>
                    <BookOpen size={18} />
                  </div>
                  <div className="dashboard-list">
                    <div className="dashboard-list__row">
                      <div>
                        <strong>نقش شما</strong>
                        <p>{Array.from(course.roles).join(" · ")}</p>
                      </div>
                      <StatusBadge status={course.status} />
                    </div>
                    <div className="dashboard-list__row">
                      <div>
                        <strong>استاد</strong>
                        <p>{course.professor}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    <Link className="btn btn-primary" href={`/courses/${course.id}`}>ورود به درس</Link>
                    <Link className="btn" href={`/courses/${course.id}/roles`}>تیم درس</Link>
                  </div>
                </Card>
              )) : <p className="muted">فعلاً هیچ درس فعالی برای شما ثبت نشده است.</p>}
            </div>
          </div>
        </section>

        <section className="dashboard-band dashboard-band--workspace">
          <div className="dashboard-band__pattern dashboard-band__pattern--tasks" aria-hidden="true" />
          <div className="shell">
            <div className="dashboard-section-head dashboard-section-head--split">
              <div>
                <Badge tone="orange">کارهای جاری</Badge>
                <h2>آنچه همین حالا باید ببینید</h2>
              </div>
              <p>آخرین درخواست‌ها، جلسه‌های آینده و اعلان‌ها در یک سطح فشرده و خوانا.</p>
            </div>

            <div className="dashboard-two-col">
              <Card className="dashboard-panel">
                <div className="dashboard-panel__head">
                  <div>
                    <h3>آخرین درخواست‌ها</h3>
                    <p className="muted">وضعیت درخواست‌های TA</p>
                  </div>
                  <Sparkles size={18} />
                </div>
                <div className="dashboard-list">
                  {data.myApplications.length ? data.myApplications.map((a) => (
                    <Link className="dashboard-list__row" href={`/applications/${a.id}`} key={a.id}>
                      <div>
                        <strong>{a.opportunity.title}</strong>
                        <p>{a.opportunity.courseOffering.course.title}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </Link>
                  )) : <p className="muted">درخواستی ثبت نشده است.</p>}
                </div>
              </Card>

              <Card className="dashboard-panel">
                <div className="dashboard-panel__head">
                  <div>
                    <h3>اعلان‌های تازه</h3>
                    <p className="muted">آخرین پیام‌های سیستمی و عملیاتی</p>
                  </div>
                  <Bell size={18} />
                </div>
                <div className="dashboard-list">
                  {data.notifications.length ? data.notifications.map((notification) => (
                    <div className="dashboard-list__row" key={notification.id}>
                      <div>
                        <strong>{notification.title}</strong>
                        <p>{notification.body}</p>
                      </div>
                      <Badge tone={notification.readAt ? "blue" : "orange"}>
                        {notification.readAt ? "خوانده‌شده" : "جدید"}
                      </Badge>
                    </div>
                  )) : <p className="muted">فعلاً اعلان جدیدی وجود ندارد.</p>}
                </div>
              </Card>
            </div>

            <div className="dashboard-two-col" style={{ marginTop: 20 }}>
              <Card className="dashboard-panel">
                <div className="dashboard-panel__head">
                  <div>
                    <h3>جلسه‌های پیش‌رو</h3>
                    <p className="muted">نزدیک‌ترین رفع‌اشکال‌ها و office hourها</p>
                  </div>
                  <CalendarClock size={18} />
                </div>
                <div className="dashboard-list">
                  {data.sessions.length ? data.sessions.map((session) => (
                    <Link className="dashboard-list__row" href={`/sessions/${session.id}`} key={session.id}>
                      <div>
                        <strong>{session.title}</strong>
                        <p>{session.courseOffering.course.title}</p>
                      </div>
                      <StatusBadge status={session.status} />
                    </Link>
                  )) : <p className="muted">جلسه‌ای برنامه‌ریزی نشده است.</p>}
                </div>
              </Card>

              <Card className="dashboard-panel">
                <div className="dashboard-panel__head">
                  <div>
                    <h3>وظایف من</h3>
                    <p className="muted">فقط کارهای قابل اقدام شما</p>
                  </div>
                  <ListChecks size={18} />
                </div>
                <div className="dashboard-list">
                  {ta.tasks.length ? ta.tasks.map((task) => (
                    <div className="dashboard-task-card" key={task.id}>
                      <div className="dashboard-task-card__head">
                        <div>
                          <h3>{task.title}</h3>
                          <p className="muted">{task.courseOffering.course.title}{task.dueAt ? ` · موعد: ${new Date(task.dueAt).toLocaleDateString("fa-IR")}` : ""}</p>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      {task.description ? <p className="dashboard-task-card__desc">{task.description}</p> : null}
                      {task.submission ? <p className="dashboard-task-card__meta">آخرین تحویل: {task.submission.file.originalName}</p> : null}
                      <DeliverableSubmit endpoint={`/api/tasks/${task.id}/submit`} currentFileName={task.submission?.file.originalName} />
                    </div>
                  )) : <p className="muted">وظیفه‌ای برای شما ثبت نشده است.</p>}
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
