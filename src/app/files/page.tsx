import { auth } from "@/server/auth/auth";
import { listMyFiles } from "@/server/services/files";
import { Topbar, Card, EmptyState } from "@/components/ui";
import { FileUploadForm, FileRow } from "./ui";

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای مدیریت فایل‌ها وارد شوید."/></main></>;
  const files = await listMyFiles(session.user.id);
  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>مدیریت فایل‌ها</h1><p className="muted">رزومه، ریزنمرات و سایر فایل‌های آپلودشده شما.</p></div></div>
    <section className="grid grid-2">
      <Card><h2>آپلود فایل جدید</h2><FileUploadForm/></Card>
      <Card><h2>فایل‌های من</h2><div className="stack">{files.length ? files.map((f) => <FileRow key={f.id} id={f.id} name={f.originalName} sizeBytes={f.sizeBytes}/>) : <p className="muted">فایلی آپلود نشده است.</p>}</div></Card>
    </section>
  </main></>;
}
