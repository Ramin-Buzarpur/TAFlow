import Link from "next/link";
import { ArrowLeft, CalendarClock, Clock3, History, Plus } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { coursePermissions } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { canAccessCourseOffering, getCoursePermissions } from "@/server/services/rbac";
import { listOfficeHours } from "@/server/services/office-hours";
import { Badge, Card, EmptyState, Kpi, StatusBadge, Topbar } from "@/components/ui";
import { NewSessionForm, RegisterButton } from "../../../sessions/ui";

export default async function CourseSessionsPage({ params }: { params: Promise<{ courseOfferingId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <EmptyState title="ورود لازم است" text="برای مشاهده جلسات درس وارد شوید." />
        </main>
      </>
    );
  }

  const { courseOfferingId } = await params;
  if (!await canAccessCourseOffering(session.user.id, courseOfferingId)) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <EmptyState title="دسترسی ندارید" text="این درس برای شما فعال نیست." />
        </main>
      </>
    );
  }

  const [offering, permissions, sessions] = await Promise.all([
    db.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: { course: true, semester: true }
    }),
    getCoursePermissions(session.user.id, courseOfferingId),
    listOfficeHours(session.user.id, { courseOfferingId, upcoming: false, take: 100 })
  ]);

  if (!offering) return null;

  const now = new Date();
  const upcoming = sessions.filter((item) => item.startsAt >= now && ["SCHEDULED", "LIVE"].includes(item.status));
  const history = sessions.filter((item) => item.startsAt < now || ["COMPLETED", "CANCELLED"].includes(item.status));
  const canCreateSession = permissions.has(coursePermissions.CREATE_OFFICE_HOUR);

  return (
    <>
      <Topbar />
      <main className="shell">
        <div className="page-title">
          <div>
            <Badge tone="blue">جلسات درس</Badge>
            <h1>{offering.course.title}</h1>
            <p className="muted">{offering.semester.title} · جلسات رفع اشکال، صف سوالات و حضور همین درس</p>
          </div>
          <Link className="btn" href={`/courses/${courseOfferingId}`}>
            بازگشت به درس
            <ArrowLeft size={16} />
          </Link>
        </div>

        <section className="grid grid-3">
          <Kpi icon={CalendarClock} label="جلسات آینده" value={upcoming.length} />
          <Kpi icon={History} label="تاریخچه جلسات" value={history.length} tone="purple" />
          <Kpi icon={Clock3} label="کل جلسات" value={sessions.length} tone="orange" />
        </section>

        <section className="grid grid-2" style={{ marginTop: 20 }}>
          <Card>
            <h2>جلسات آینده</h2>
            <div className="stack" style={{ marginTop: 14 }}>
              {upcoming.length ? upcoming.map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p className="muted">{new Date(item.startsAt).toLocaleString("fa-IR")} · میزبان: {item.host.name || item.host.email}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {item.meetingUrl ? <a className="btn btn-primary" href={item.meetingUrl} target="_blank">ورود به جلسه</a> : null}
                    <Link className="btn" href={`/sessions/${item.id}`}>صف سوالات</Link>
                    <RegisterButton sessionId={item.id} />
                    <Link className="btn" href={`/api/sessions/${item.id}/ics`}>iCal</Link>
                    <StatusBadge status={item.status} />
                  </div>
                </div>
              )) : <EmptyState title="جلسه آینده‌ای نیست" text="برای این درس جلسه فعالی برنامه‌ریزی نشده است." />}
            </div>
          </Card>

          <Card>
            <h2>ساخت جلسه برای همین درس</h2>
            {canCreateSession ? (
              <NewSessionForm
                offerings={[{ id: offering.id, title: `${offering.course.title} · ${offering.semester.title}` }]}
                currentUserId={session.user.id}
              />
            ) : (
              <EmptyState title="نیازمند نقش مجاز" text="ساخت جلسه فقط برای استاد، TA و Head TA همین درس فعال است." />
            )}
          </Card>
        </section>

        <Card style={{ marginTop: 20 }}>
          <h2>تاریخچه جلسات</h2>
          <div className="stack" style={{ marginTop: 14 }}>
            {history.length ? history.map((item) => (
              <Link className="list-row" href={`/sessions/${item.id}`} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p className="muted">{new Date(item.startsAt).toLocaleString("fa-IR")} · میزبان: {item.host.name || item.host.email}</p>
                </div>
                <StatusBadge status={item.status} />
              </Link>
            )) : <p className="muted">هنوز جلسه‌ای در تاریخچه این درس ثبت نشده است.</p>}
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Link className="btn btn-primary" href="/sessions">
            <Plus size={16} />
            نمای همه جلسات
          </Link>
        </div>
      </main>
    </>
  );
}
