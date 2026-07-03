import { auth } from "@/server/auth/auth";
import { listMyCourseOfferings } from "@/server/services/rbac";
import { Topbar, EmptyState } from "@/components/ui";
import { NewOpportunityForm } from "./ui";

export default async function NewOpportunityPage() {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای ایجاد فرصت TA وارد شوید."/></main></>;
  const offerings = await listMyCourseOfferings(session.user.id);
  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>ایجاد فرصت TA / Head TA</h1><p className="muted">فرصت بلافاصله پس از ثبت برای دانشجویان درس منتشر می‌شود.</p></div></div>
    {offerings.length
      ? <NewOpportunityForm offerings={offerings.map((o) => ({ id: o.id, title: `${o.course.title} — ${o.semester.title}` }))}/>
      : <EmptyState title="ارائه درسی برای شما ثبت نشده" text="ابتدا باید در یک ارائه درس نقش استاد داشته باشید."/>}
  </main></>;
}
