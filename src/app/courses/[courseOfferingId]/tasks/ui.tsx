"use client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

export function NewTaskForm({ courseOfferingId }: { courseOfferingId: string }) {
  const router = useRouter();
  const toast = useToast();
  async function submit(fd: FormData) {
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseOfferingId, title: fd.get("title"), description: fd.get("description") || undefined, dueAt: fd.get("dueAt") || undefined }) });
    const json = await res.json();
    if (res.ok) { toast.show("وظیفه ثبت شد.", "success"); router.refresh(); }
    else toast.show(json.message || "خطا در ثبت وظیفه", "error");
  }
  return <form className="form" style={{ gridTemplateColumns: "2fr 3fr 1fr auto", display: "grid", gap: 10 }} action={submit}>
    <input className="input" name="title" placeholder="عنوان وظیفه" required/>
    <input className="input" name="description" placeholder="توضیح"/>
    <input className="input" name="dueAt" type="date"/>
    <button className="btn btn-primary">افزودن وظیفه</button>
  </form>;
}
