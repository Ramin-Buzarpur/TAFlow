import Link from "next/link";
import { ShieldCheck, UserCircle2 } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { getMyProfile } from "@/server/services/users";
import { listMyCourseContexts } from "@/server/services/courses";
import { Badge, Card, EmptyState, Topbar } from "@/components/ui";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <EmptyState title="ورود لازم است" text="برای مشاهده پروفایل وارد شوید." />
        </main>
      </>
    );
  }

  const [profile, courses] = await Promise.all([
    getMyProfile(session.user.id),
    listMyCourseContexts(session.user.id)
  ]);

  return (
    <>
      <Topbar />
      <main className="shell">
        <div className="page-title">
          <div>
            <Badge tone="blue">پروفایل</Badge>
            <h1>پروفایل کاربری</h1>
            <p className="muted">نمای خلاصه‌ی حساب، وضعیت امنیتی و درس‌های فعال شما.</p>
          </div>
          <Link className="btn btn-primary" href="/settings">
            <UserCircle2 size={16} />
            رفتن به تنظیمات
          </Link>
        </div>

        <section className="grid grid-2">
          <Card>
            <h2>اطلاعات حساب</h2>
            <div className="stack">
              <div className="list-row"><span>نام</span><strong>{profile.name || "بدون نام"}</strong></div>
              <div className="list-row"><span>ایمیل</span><strong>{profile.email}</strong></div>
              <div className="list-row"><span>نقش سراسری</span><strong>{profile.globalRole}</strong></div>
              <div className="list-row"><span>وضعیت</span><strong>{profile.status}</strong></div>
              <div className="list-row"><span>منطقه زمانی</span><strong>{profile.timezone}</strong></div>
            </div>
          </Card>

          <Card>
            <h2>امنیت و دسترسی</h2>
            <div className="stack">
              <div className="list-row"><span>2FA</span><strong>{profile.twoFactorEnabled ? "فعال" : "غیرفعال"}</strong></div>
              <div className="list-row"><span>اجباری</span><strong>{profile.twoFactorRequired ? "بله" : "خیر"}</strong></div>
              <div className="list-row"><span>آخرین تغییر امنیتی</span><strong>{profile.twoFactorChangedAt ? new Date(profile.twoFactorChangedAt).toLocaleDateString("fa-IR") : "-"}</strong></div>
              <div className="list-row"><span>پروفایل آموزشی</span><strong>{profile.studentProfile ? "دانشجویی" : profile.professorProfile ? "استادی" : "-"}</strong></div>
            </div>
            <p className="muted">مدیریت رمز، 2FA و سایر تنظیمات از صفحه‌ی تنظیمات انجام می‌شود.</p>
          </Card>
        </section>

        <section style={{ marginTop: 24 }} className="stack">
          <div className="list-row" style={{ border: "none", padding: 0 }}>
            <div>
              <h2>درس‌های فعال</h2>
              <p className="muted">هر درس صفحه‌ی مستقل خودش را دارد و از همین‌جا قابل ورود است.</p>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="grid grid-3">
            {courses.length ? courses.map((course) => (
              <Card key={course.courseOffering.id} className="dashboard-panel">
                <div className="stack">
                  <strong>{course.courseOffering.course.title}</strong>
                  <p className="muted">{course.courseOffering.semester.title}</p>
                  <div className="dashboard-hero__chips">
                    {course.roles.map((role) => <span key={role}>{role}</span>)}
                  </div>
                  <Link className="btn btn-primary" href={`/courses/${course.courseOffering.id}`}>ورود به درس</Link>
                </div>
              </Card>
            )) : <p className="muted">فعلاً عضویت فعالی ثبت نشده است.</p>}
          </div>
        </section>
      </main>
    </>
  );
}
