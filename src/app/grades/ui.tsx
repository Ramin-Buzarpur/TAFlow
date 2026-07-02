"use client";
import { useState } from "react";
export function RegradeButton({ gradeRecordId }: { gradeRecordId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  async function submit() {
    setMsg("در حال ثبت...");
    const res = await fetch("/api/regrade-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradeRecordId, reason }) });
    const j = await res.json();
    setMsg(res.ok ? "ثبت شد." : j.message || "خطا در ثبت درخواست");
    if (res.ok) window.location.reload();
  }
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>درخواست تجدیدنظر</button>;
  return <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
    <input className="input" style={{ width: 200 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل اعتراض"/>
    <button className="btn btn-primary" onClick={submit}>ارسال</button>
    {msg ? <span className="muted" style={{ fontSize: 12 }}>{msg}</span> : null}
  </div>;
}
