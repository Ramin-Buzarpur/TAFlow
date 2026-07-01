"use client";
import { useState } from "react";
export function NewTaskForm({ courseOfferingId }: { courseOfferingId: string }) {
  const [msg, setMsg] = useState("");
  async function submit(fd: FormData) {
    setMsg("در حال ثبت...");
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseOfferingId, title: fd.get("title"), description: fd.get("description") || undefined, dueAt: fd.get("dueAt") || undefined }) });
    const json = await res.json();
    setMsg(res.ok ? "وظیفه ثبت شد." : json.message || "خطا در ثبت وظیفه");
    if (res.ok) window.location.reload();
  }
  return <form className="form" style={{ gridTemplateColumns: "2fr 3fr 1fr auto", display: "grid", gap: 10 }} action={submit}>
    <input className="input" name="title" placeholder="عنوان وظیفه" required/>
    <input className="input" name="description" placeholder="توضیح"/>
    <input className="input" name="dueAt" type="date"/>
    <button className="btn btn-primary">افزودن وظیفه</button>
    {msg ? <p className="muted" style={{ gridColumn: "1 / -1" }}>{msg}</p> : null}
  </form>;
}
