"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { FileUpload } from "@/components/file-upload";

function GroupButton({ endpoint, label }: { endpoint: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();
  async function trigger() {
    setLoading(true);
    const res = await fetch(endpoint, { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (res.ok) {
      toast.show(json.addedCount > 0 ? `گروه به‌روزرسانی شد (${json.addedCount} عضو جدید)` : "گروه از قبل کامل است.", "success");
      router.refresh();
    } else toast.show(json.message || "خطا در ساخت گروه", "error");
  }
  return <button className="btn" disabled={loading} onClick={trigger}>{label}</button>;
}

export function CommunicationGroupButtons({ courseOfferingId }: { courseOfferingId: string }) {
  return <div className="stack">
    <GroupButton endpoint={`/api/course-offerings/${courseOfferingId}/threads/ta-team`} label="ساخت/همگام‌سازی گروه تیم TA"/>
    <GroupButton endpoint={`/api/course-offerings/${courseOfferingId}/threads/course-wide`} label="ساخت/همگام‌سازی گروه کل درس"/>
  </div>;
}

type CourseMaterial = {
  id: string;
  title: string | null;
  createdAt: string;
  file: { id: string; originalName: string; sizeBytes: number };
  uploadedBy: { name: string | null; email: string };
};

export function CourseMaterialsSection({ courseOfferingId, materials, canManage }: { courseOfferingId: string; materials: CourseMaterial[]; canManage: boolean }) {
  const [titleDraft, setTitleDraft] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function attachMaterial(fileId: string, fileName: string) {
    const res = await fetch(`/api/course-offerings/${courseOfferingId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, title: titleDraft.trim() || undefined })
    });
    const json = await res.json();
    if (res.ok) { toast.show(`فایل «${fileName}» اضافه شد.`, "success"); setTitleDraft(""); router.refresh(); }
    else toast.show(json.message || "خطا در افزودن فایل", "error");
  }

  async function download(fileId: string) {
    const res = await fetch(`/api/files/${fileId}`);
    const json = await res.json();
    if (res.ok) window.open(json.url, "_blank");
    else toast.show(json.message || "خطا در دریافت فایل", "error");
  }

  async function remove(materialId: string) {
    const res = await fetch(`/api/course-materials/${materialId}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) { toast.show("فایل حذف شد.", "success"); router.refresh(); }
    else toast.show(json.message || "خطا در حذف فایل", "error");
  }

  return <div className="stack">
    {materials.length === 0 ? <p className="muted">هنوز فایلی برای این درس بارگذاری نشده است.</p> : materials.map((m) => <div className="list-row" key={m.id}>
      <div>
        <strong>{m.title || m.file.originalName}</strong>
        <p className="muted">{m.file.originalName} · {(m.file.sizeBytes / 1024).toFixed(0)} کیلوبایت · {m.uploadedBy.name || m.uploadedBy.email}</p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => download(m.file.id)}>دانلود</button>
        {canManage ? <button className="btn" onClick={() => remove(m.id)}>حذف</button> : null}
      </div>
    </div>)}
    {canManage ? <div className="stack" style={{ marginTop: 10 }}>
      <input className="input" placeholder="عنوان فایل (اختیاری)" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}/>
      <FileUpload accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt" helpText="جزوه، اسلاید یا هر فایل آموزشی دیگر را اینجا بارگذاری کنید." onUploaded={attachMaterial}/>
    </div> : null}
  </div>;
}
