import { auth } from "@/server/auth/auth";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, getCoursePermissions } from "@/server/services/rbac";
import { getCourseOfferingIdentity, listCourseRoleAssignments } from "@/server/services/course-roles";
import { Topbar, EmptyState, Kpi, Card, Badge } from "@/components/ui";
import Link from "next/link";
import { CourseRoleManagementPanel } from "./ui";

export default async function CourseRolesPage({ params }: { params: Promise<{ courseOfferingId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return <><Topbar /><main className="shell"><EmptyState title="ورود لازم است" text="برای مدیریت نقش‌های درس وارد شوید."/></main></>;
  }

  const { courseOfferingId } = await params;
  if (!await canAccessCourseOffering(session.user.id, courseOfferingId)) {
    return <><Topbar /><main className="shell"><EmptyState title="دسترسی ندارید" text="این درس برای شما فعال نیست."/></main></>;
  }

  const [offering, permissions, assignments] = await Promise.all([
    getCourseOfferingIdentity(courseOfferingId),
    getCoursePermissions(session.user.id, courseOfferingId),
    listCourseRoleAssignments(session.user.id, { courseOfferingId, includeRevoked: true })
  ]);

  const canManage = permissions.has(coursePermissions.MANAGE_COURSE_ROLES);
  if (!canManage) {
    return <><Topbar /><main className="shell"><EmptyState title="دسترسی محدود" text="فقط استاد یا مدیر آموزشی می‌تواند نقش‌های این درس را مدیریت کند."/></main></>;
  }

  const activeCount = assignments.filter((assignment) => !assignment.revokedAt).length;
  const revokedCount = assignments.length - activeCount;

  return <><Topbar /><main className="shell">
    <div className="page-title">
      <div>
        <h1>مدیریت نقش‌های درس</h1>
        <p className="muted">
          {offering.course.title} — {offering.semester.title}
        </p>
      </div>
      <Link className="btn" href={`/courses/${courseOfferingId}`}>بازگشت به پنل درس</Link>
    </div>

    <section className="grid grid-3">
      <Kpi label="نقش فعال" value={activeCount} tone="blue" />
      <Kpi label="سابقه لغوشده" value={revokedCount} tone="orange" />
      <Kpi label="کل نقش‌ها" value={assignments.length} tone="purple" />
    </section>

    <section style={{ marginTop: 20 }}>
      <Card>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>وضعیت نقش‌ها</h2>
          <Badge tone="blue">Course-scoped</Badge>
          <Badge tone="gray">{offering.course.code}</Badge>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          این صفحه برای ثبت، ویرایش و لغو نقش‌های فعال درس استفاده می‌شود و تاریخچه را هم نگه می‌دارد.
        </p>
      </Card>
    </section>

    <section style={{ marginTop: 20 }}>
      <CourseRoleManagementPanel
        courseOfferingId={courseOfferingId}
        assignments={assignments.map((assignment) => ({
          id: assignment.id,
          role: assignment.role,
          note: assignment.note,
          assignmentSource: assignment.assignmentSource,
          activeFrom: assignment.activeFrom.toISOString(),
          activeUntil: assignment.activeUntil?.toISOString() ?? null,
          createdAt: assignment.createdAt.toISOString(),
          updatedAt: assignment.updatedAt.toISOString(),
          revokedAt: assignment.revokedAt?.toISOString() ?? null,
          revokeReason: assignment.revokeReason,
          user: {
            id: assignment.user.id,
            name: assignment.user.name,
            email: assignment.user.email
          },
          assignedBy: assignment.assignedBy ? {
            id: assignment.assignedBy.id,
            name: assignment.assignedBy.name,
            email: assignment.assignedBy.email
          } : null,
          revokedBy: assignment.revokedBy ? {
            id: assignment.revokedBy.id,
            name: assignment.revokedBy.name,
            email: assignment.revokedBy.email
          } : null
        }))}
        canManage={canManage}
      />
    </section>
  </main></>;
}
