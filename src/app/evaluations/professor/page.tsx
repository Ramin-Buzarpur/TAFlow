import { auth } from "@/server/auth/auth";
import { listEvaluableCourseOfferings } from "@/server/services/evaluations";
import { Topbar, Card, EmptyState } from "@/components/ui";
import { EvaluationForm } from "./ui";

export default async function ProfessorEvaluationPage() {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای ارزشیابی استاد وارد شوید."/></main></>;
  const offerings = await listEvaluableCourseOfferings(session.user.id);
  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>ارزشیابی استاد</h1><p className="muted">فقط دانشجویان ثبت‌نام‌شده در درس می‌توانند استاد را ارزشیابی کنند؛ پاسخ‌ها ناشناس ثبت می‌شوند و هر دانشجو فقط یک بار می‌تواند ارزشیابی کند.</p></div></div>
    <section className="grid grid-2">
      {offerings.length ? offerings.map((o) => <Card key={o.id}><h2>{o.course.title}</h2><p className="muted">{o.semester.title}</p><EvaluationForm courseOfferingId={o.id}/></Card>) : <EmptyState title="درسی برای ارزشیابی وجود ندارد" text="در حال حاضر در درسی ثبت‌نام فعال ندارید."/>}
    </section>
  </main></>;
}
