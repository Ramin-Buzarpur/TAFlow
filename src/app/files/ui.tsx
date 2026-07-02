"use client";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/file-upload";
import { useToast } from "@/components/toast";

export function FileUploadForm() {
  const router = useRouter();
  const toast = useToast();
  return <FileUpload onUploaded={(_id, name) => { toast.show(`آپلود شد: ${name}`, "success"); router.refresh(); }}/>;
}

export function FileRow({ id, name, sizeBytes }: { id: string; name: string; sizeBytes: number }) {
  const router = useRouter();
  const toast = useToast();
  async function download() {
    const res = await fetch(`/api/files/${id}`);
    const json = await res.json();
    if (res.ok) window.open(json.url, "_blank"); else toast.show(json.message, "error");
  }
  async function remove() {
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (res.ok) { toast.show("فایل حذف شد.", "success"); router.refresh(); }
    else toast.show((await res.json()).message, "error");
  }
  return <div className="list-row">
    <div><strong>{name}</strong><p className="muted">{(sizeBytes / 1024).toFixed(0)} KB</p></div>
    <div style={{ display: "flex", gap: 8 }}>
      <button className="btn" onClick={download}>دانلود</button>
      <button className="btn" onClick={remove}>حذف</button>
    </div>
  </div>;
}
