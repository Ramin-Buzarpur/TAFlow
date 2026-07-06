import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/db";
import { canAccessCourseOffering, getCoursePermissions } from "@/server/services/rbac";
import { coursePermissions } from "@/server/auth/permissions";
import { listCourseMaterials } from "@/server/services/course-materials";
import { Topbar, Card, EmptyState, Kpi, StatusBadge } from "@/components/ui";
import { CommunicationGroupButtons, CourseMaterialsSection } from "./ui";

export default async function CoursePanel({ params }: { params: Promise<{ courseOfferingId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <EmptyState title="ورود لازم است" text="برای مشاهده پنل درس وارد شوید." />
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

  const [offering, permissions, materials] = await Promise.all([
    db.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        semester: true,
        professor: { select: { name: true, email: true } },
        roles: { include: { user: { select: { name: true, email: true } } } },
        opportunities: { include: { _count: { select: { applications: true } } } },
        officeHours: { orderBy: { startsAt: "asc" }, take: 5 }
      }
    }),
    getCoursePermissions(session.user.id, courseOfferingId),
    listCourseMaterials(session.user.id, courseOfferingId)
  ]);

  if (!offering) return null;

  const canManageGroups = permissions.has(coursePermissions.MODERATE_MESSAGES);
  const canManageMaterials = permissions.has(coursePermissions.MANAGE_COURSE_MATERIALS);
  const canManageRoles = permissions.has(coursePermissions.MANAGE_COURSE_ROLES);

  return (
    <>
      <Topbar />
      <main className="shell">
        <div className="page-title">
          <div>
            <h1>{offering.course.title}</h1>
            <p className="muted">{offering.semester.title} — استاد: {offering.professor.name}</p>
          </div>
          <StatusBadge status={offering.status} />
        </div>

        <section className="grid grid-4">
          <Kpi label="اعضای تیم" value={offering.roles.length} />
          <Kpi label="فرصت‌های TA" value={offering.opportunities.length} tone="purple" />
          <Kpi label="جلسات" value={offering.officeHours.length} tone="orange" />
          <Kpi label="ظرفیت" value={offering.capacity || "-"} tone="green" />
        </section>

        <section className="grid grid-3" style={{ marginTop: 20 }}>
          <Card>
            <h2>تیم درس</h2>
            <div className="stack">
              {offering.roles.map((role) => (
                <div className="list-row" key={role.id}>
                  <div>
                    <strong>{role.user.name || role.user.email}</strong>
                    <p className="muted">{role.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2>فرصت‌های TA</h2>
            <div className="stack">
              {offering.opportunities.map((opportunity) => (
                <Link className="list-row" href={`/opportunities/${opportunity.id}`} key={opportunity.id}>
                  <div>
                    <strong>{opportunity.title}</strong>
                    <p className="muted">{opportunity._count.applications} درخواست</p>
                  </div>
                  <StatusBadge status={opportunity.status} />
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <h2>لینک‌های عملیاتی</h2>
            <div className="stack">
              <Link className="btn" href={`/courses/${courseOfferingId}/grading`}>دفتر نمرات</Link>
              <Link className="btn" href={`/courses/${courseOfferingId}/tasks`}>مدیریت وظایف تیم TA</Link>
              <Link className="btn" href={`/courses/${courseOfferingId}/files`}>فایل‌های درس</Link>
              <Link className="btn" href={`/api/exports/roster/${courseOfferingId}`}>خروجی اعضای کلاس</Link>
              <Link className="btn" href={`/courses/${courseOfferingId}/sessions`}>جلسات رفع اشکال</Link>
              <Link className="btn" href="/surveys">ارزیابی‌ها</Link>
              {canManageRoles ? <Link className="btn btn-primary" href={`/courses/${courseOfferingId}/roles`}>مدیریت نقش‌های درس</Link> : null}
            </div>
          </Card>
        </section>

        <Card style={{ marginTop: 20 }}>
          <h2>فایل‌های آموزشی</h2>
          <CourseMaterialsSection
            courseOfferingId={courseOfferingId}
            materials={materials.map((material) => ({
              ...material,
              createdAt: material.createdAt.toISOString()
            }))}
            canManage={canManageMaterials}
          />
        </Card>

        {canManageGroups ? (
          <Card style={{ marginTop: 20 }}>
            <h2>گروه‌های ارتباطی</h2>
            <p className="muted">هر زمان می‌توانید گروه تیم TA یا کل درس را بسازید یا اعضای جدید را به آن اضافه کنید.</p>
            <CommunicationGroupButtons courseOfferingId={courseOfferingId} />
          </Card>
        ) : null}
      </main>
    </>
  );
}
