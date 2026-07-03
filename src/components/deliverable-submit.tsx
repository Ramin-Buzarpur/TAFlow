"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "./file-upload";
import { useToast } from "./toast";

const HELP_TEXT = "هر فایلی (PDF، Word، Excel، zip، متن یا کد) تا ۱۰ مگابایت — یک فایل کافی است، چند فایل را zip کنید.";

export function DeliverableSubmit({ endpoint, currentFileName }: { endpoint: string; currentFileName?: string | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function submit(fileId: string, fileName: string) {
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileId }) });
    const json = await res.json();
    if (res.ok) { toast.show(`تحویل ثبت شد: ${fileName}`, "success"); setOpen(false); router.refresh(); }
    else toast.show(json.message || "خطا در ثبت تحویل", "error");
  }

  if (!open) return <button className="btn" onClick={() => setOpen(true)}>{currentFileName ? `تحویل مجدد (${currentFileName})` : "تحویل فایل"}</button>;
  return <FileUpload helpText={HELP_TEXT} onUploaded={submit}/>;
}
