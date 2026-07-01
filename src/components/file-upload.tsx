"use client";
import { useRef, useState } from "react";

export function FileUpload({ onUploaded, visibility, accept }: { onUploaded: (fileId: string, fileName: string) => void; visibility?: "PRIVATE" | "COURSE_STAFF" | "PUBLIC"; accept?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    setStatus("در حال آپلود...");
    const fd = new FormData();
    fd.append("file", file);
    if (visibility) fd.append("visibility", visibility);
    const res = await fetch("/api/files", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) {
      setStatus(`آپلود شد: ${file.name}`);
      onUploaded(json.id, json.originalName);
    } else {
      setStatus(json.message || "خطا در آپلود فایل");
    }
  }

  return <div
    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
    onDragLeave={() => setDragOver(false)}
    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
    onClick={() => inputRef.current?.click()}
    style={{ border: `2px dashed ${dragOver ? "var(--primary)" : "var(--line)"}`, borderRadius: 16, padding: 20, textAlign: "center", cursor: "pointer", background: dragOver ? "#eff6ff" : "transparent" }}
  >
    <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}/>
    <p className="muted">فایل را اینجا رها کنید یا برای انتخاب کلیک کنید (PDF، Word یا تصویر، حداکثر ۱۰ مگابایت)</p>
    {status ? <p style={{ marginTop: 8 }}>{status}</p> : null}
  </div>;
}
