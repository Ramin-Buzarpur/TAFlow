import Link from "next/link";
import { ArrowLeft, BookOpen, LayoutGrid, Users } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { listMyCourseContexts } from "@/server/services/courses";
import { Badge, Card, EmptyState, Topbar } from "@/components/ui";

export default async function CoursesIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <EmptyState title="ورود لازم است" text="برای مشاهده درس‌های خود وارد شوید." />
        </main>
      </>
    );
  }

  const courses = await listMyCourseContexts(session.user.id);

  return (
    <>
      <Topbar />
      <main className="shell">
        <div className="page-title">
          <div>
            <Badge tone="blue">درس‌ها</Badge>
            <h1>درس‌های من</h1>
            <p className="muted">همه‌ی نقش‌ها، ابزارها و مسیرهای عملیاتی فقط داخل صفحه‌ی هر درس قرار دارند.</p>
          </div>
          <Link className="btn btn-primary" href="/dashboard">
            <ArrowLeft size={16} />
            بازگشت به داشبورد
          </Link>
        </div>

        <section className="grid grid-3">
          {courses.length ? courses.map((course) => (
            <Card key={course.courseOffering.id}>
              <div className="stack">
                <div className="list-row" style={{ border: "none", padding: 0 }}>
                  <div>
                    <p className="muted">{course.courseOffering.course.code}</p>
                    <h2>{course.courseOffering.course.title}</h2>
                  </div>
                  <BookOpen size={18} />
                </div>

                <p className="muted">
                  {course.courseOffering.semester.title}
                  {course.courseOffering.section ? ` · بخش ${course.courseOffering.section}` : ""}
                </p>

                <div className="dashboard-hero__chips">
                  {course.roles.map((role) => <span key={role}>{role}</span>)}
                </div>

                <div className="grid grid-2">
                  <div className="list-row"><span>وضعیت</span><strong>{course.courseOffering.status}</strong></div>
                  <div className="list-row"><span>واحد</span><strong>{course.courseOffering.course.units}</strong></div>
                </div>

                <div className="stack" style={{ gap: 8 }}>
                  <div className="list-row">
                    <span>استاد</span>
                    <strong>{course.courseOffering.professor.name || course.courseOffering.professor.email}</strong>
                  </div>
                  <div className="list-row">
                    <span>اعضا</span>
                    <strong>{course.roles.length}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link className="btn btn-primary" href={`/courses/${course.courseOffering.id}`}>
                    ورود به درس
                  </Link>
                  <Link className="btn" href={`/courses/${course.courseOffering.id}/roles`}>
                    تیم درس
                  </Link>
                </div>
              </div>
            </Card>
          )) : <EmptyState title="درسی یافت نشد" text="برای شما هنوز عضویت فعالی ثبت نشده است." />}
        </section>

        {courses.length ? (
          <section className="grid grid-3" style={{ marginTop: 24 }}>
            <Card>
              <div className="list-row" style={{ border: "none", padding: 0 }}>
                <div>
                  <h2>دسترسی سریع</h2>
                  <p className="muted">برای کارهای روزمره، از صفحه‌ی همان درس وارد شوید.</p>
                </div>
                <LayoutGrid size={18} />
              </div>
            </Card>
            <Card>
              <h2>پشتیبانی دوره</h2>
              <p className="muted">فایل‌ها، جلسات، نمره‌ها و نقش‌ها همگی درون درس مدیریت می‌شوند.</p>
            </Card>
            <Card>
              <h2>ساختار درس</h2>
              <div className="stack">
                <div className="list-row"><span>تیم</span><strong><Users size={16} /></strong></div>
                <div className="list-row"><span>فایل‌ها</span><strong><BookOpen size={16} /></strong></div>
              </div>
            </Card>
          </section>
        ) : null}
      </main>
    </>
  );
}
