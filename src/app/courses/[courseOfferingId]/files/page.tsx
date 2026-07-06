import Link from "next/link";
import { ArrowLeft, Files, Upload } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { coursePermissions } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { canAccessCourseOffering, getCoursePermissions } from "@/server/services/rbac";
import { listCourseMaterials } from "@/server/services/course-materials";
import { Badge, Card, EmptyState, Kpi, Topbar } from "@/components/ui";
import { CourseMaterialsSection } from "../ui";

export default async function CourseFilesPage({ params }: { params: Promise<{ courseOfferingId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <EmptyState title="ورود لازم است" text="برای مشاهده فایل‌های درس وارد شوید." />
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
    db.courseOffering.findUnique({ where: { id: courseOfferingId }, include: { course: true, semester: true } }),
    getCoursePermissions(session.user.id, courseOfferingId),
    listCourseMaterials(session.user.id, courseOfferingId)
  ]);

  if (!offering) return null;

  const canManage = permissions.has(coursePermissions.MANAGE_COURSE_MATERIALS);
  const totalSizeKb = materials.reduce((sum, material) => sum + Math.round(material.file.sizeBytes / 1024), 0);

  return (
    <>
      <Topbar />
      <main className="shell">
        <div className="page-title">
          <div>
            <Badge tone="blue">فایل‌های درس</Badge>
            <h1>{offering.course.title}</h1>
            <p className="muted">{offering.semester.title} · جزوه‌ها، فایل‌های تمرین و منابع همین درس</p>
          </div>
          <Link className="btn" href={`/courses/${courseOfferingId}`}>
            بازگشت به درس
            <ArrowLeft size={16} />
          </Link>
        </div>

        <section className="grid grid-3">
          <Kpi icon={Files} label="فایل‌های درس" value={materials.length} />
          <Kpi icon={Upload} label="حجم تقریبی" value={`${totalSizeKb} KB`} tone="purple" />
          <Kpi label="مدیریت فایل" value={canManage ? "فعال" : "مشاهده"} tone="orange" />
        </section>

        <Card style={{ marginTop: 20 }}>
          <h2>منابع و فایل‌ها</h2>
          <CourseMaterialsSection
            courseOfferingId={courseOfferingId}
            materials={materials.map((material) => ({
              ...material,
              createdAt: material.createdAt.toISOString()
            }))}
            canManage={canManage}
          />
        </Card>
      </main>
    </>
  );
}
