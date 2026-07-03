import { auth } from "@/server/auth/auth";
import { listDepartments, listSemesters, listCourses, listCourseOfferings, listUsers } from "@/server/services/admin";
import { Topbar, Card, EmptyState, StatusBadge } from "@/components/ui";
import { DepartmentForm, SemesterForm, CourseForm, CourseOfferingForm, RoleAssignForm, SystemHealthCard } from "./ui";

export default async function AdminPage() {
  const session = await auth();
  const isAdmin = session?.user?.globalRole === "SYSTEM_ADMIN" || session?.user?.globalRole === "EDUCATION_ADMIN";
  if (!session?.user?.id || !isAdmin) return <><Topbar/><main className="shell"><EmptyState title="دسترسی غیرمجاز" text="این بخش فقط برای ادمین سیستم و آموزش قابل مشاهده است."/></main></>;

  const [departments, semesters, courses, offerings, users] = await Promise.all([
    listDepartments(), listSemesters(), listCourses(), listCourseOfferings(), listUsers({ take: 20 })
  ]);

  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>پنل مدیریت ادمین</h1><p className="muted">مدیریت دانشکده‌ها، ترم‌ها، درس‌ها، ارائه درس‌ها، کاربران و نقش‌های درس‌محور.</p></div></div>

    <section className="grid grid-2">
      <Card><h2>دانشکده‌ها</h2><DepartmentForm/><div className="stack" style={{ marginTop: 14 }}>{departments.map((d) => <div className="list-row" key={d.id}><strong>{d.name}</strong><span className="muted">{d.code}</span></div>)}</div></Card>
      <Card><h2>ترم‌های تحصیلی</h2><SemesterForm/><div className="stack" style={{ marginTop: 14 }}>{semesters.map((s) => <div className="list-row" key={s.id}><strong>{s.title}</strong><StatusBadge status={s.status}/></div>)}</div></Card>
      <Card><h2>درس‌ها</h2><CourseForm departments={departments}/><div className="stack" style={{ marginTop: 14 }}>{courses.map((c) => <div className="list-row" key={c.id}><strong>{c.title}</strong><span className="muted">{c.code}</span></div>)}</div></Card>
      <Card><h2>ارائه درس‌ها</h2><CourseOfferingForm courses={courses} semesters={semesters}/><div className="stack" style={{ marginTop: 14 }}>{offerings.slice(0, 10).map((o) => <div className="list-row" key={o.id}><div><strong>{o.course.title}</strong><p className="muted">{o.semester.title} — {o.professor.name}</p></div><StatusBadge status={o.status}/></div>)}</div></Card>
      <Card><h2>کاربران</h2><div className="stack">{users.map((u) => <div className="list-row" key={u.id}><div><strong>{u.name || u.email}</strong><p className="muted">{u.email}</p></div><StatusBadge status={u.globalRole}/></div>)}</div></Card>
      <Card><h2>نقش‌ها و مجوزهای درس‌محور</h2><RoleAssignForm/></Card>
      <Card><h2>سلامت سیستم</h2><SystemHealthCard/></Card>
    </section>
  </main></>;
}
