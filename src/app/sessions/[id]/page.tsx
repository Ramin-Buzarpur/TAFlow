import { auth } from "@/server/auth/auth";
import { getJoinableSession } from "@/server/services/office-hours";
import { getCoursePermissions } from "@/server/services/rbac";
import { coursePermissions } from "@/server/auth/permissions";
import { Topbar, Card, EmptyState, StatusBadge } from "@/components/ui";
import { QueuePanel } from "./ui";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای مشاهده جلسه وارد شوید."/></main></>;
  const { id } = await params;
  const officeHour = await getJoinableSession(session.user.id, id);
  const permissions = await getCoursePermissions(session.user.id, officeHour.courseOfferingId);
  const canManage = permissions.has(coursePermissions.MANAGE_OFFICE_HOUR);

  return <><Topbar/><main className="shell">
    <div className="page-title">
      <div><h1>{officeHour.title}</h1><p className="muted">{officeHour.courseOffering.course.title} — میزبان: {officeHour.host.name}</p></div>
      <StatusBadge status={officeHour.status}/>
    </div>
    <section className="grid grid-2">
      <Card>
        <h2>جزئیات جلسه</h2>
        <p className="muted">{new Date(officeHour.startsAt).toLocaleString("fa-IR")} تا {new Date(officeHour.endsAt).toLocaleString("fa-IR")}</p>
        {officeHour.meetingUrl ? <a className="btn btn-primary" href={officeHour.meetingUrl} target="_blank" style={{ marginTop: 10, display: "inline-block" }}>ورود به جلسه</a> : null}
        {officeHour.location ? <p className="muted" style={{ marginTop: 10 }}>مکان: {officeHour.location}</p> : null}
      </Card>
      <Card>
        <h2>صف رفع اشکال</h2>
        <p className="muted">وقتی نوبت شماست وارد جلسه شوید؛ لیست هر چند ثانیه به‌روزرسانی می‌شود.</p>
        <QueuePanel sessionId={id} currentUserId={session.user.id} canManage={canManage}/>
      </Card>
    </section>
  </main></>;
}
