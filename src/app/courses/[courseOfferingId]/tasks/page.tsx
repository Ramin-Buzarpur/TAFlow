import { auth } from "@/server/auth/auth";
import { listTasks } from "@/server/services/tasks";
import { Topbar, EmptyState } from "@/components/ui";
import { Kanban } from "@/components/kanban";
import { NewTaskForm } from "./ui";

export default async function CourseTasksPage({ params }: { params: Promise<{ courseOfferingId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای مدیریت وظایف وارد شوید."/></main></>;
  const { courseOfferingId } = await params;
  const tasks = await listTasks(session.user.id, courseOfferingId);
  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>مدیریت وظایف تیم TA</h1><p className="muted">تعریف، تخصیص و پیگیری وظایف تیم دستیاران آموزشی این درس.</p></div></div>
    <div style={{ marginBottom: 20 }}><NewTaskForm courseOfferingId={courseOfferingId}/></div>
    {tasks.length ? <Kanban tasks={tasks.map((t) => ({ id: t.id, title: t.title, description: t.description, status: t.status, assignee: t.assignee, dueAt: t.dueAt ? t.dueAt.toISOString() : null, submission: t.submissions[0] ? { submittedAt: t.submissions[0].submittedAt.toISOString(), file: t.submissions[0].file } : null }))}/> : <EmptyState title="هنوز وظیفه‌ای تعریف نشده" text="از فرم بالا اولین وظیفه تیم را اضافه کنید."/>}
  </main></>;
}
