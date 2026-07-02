"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

export function RegradeButton({ gradeRecordId }: { gradeRecordId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const toast = useToast();
  async function submit() {
    const res = await fetch("/api/regrade-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradeRecordId, reason }) });
    const j = await res.json();
    if (res.ok) { toast.show("درخواست تجدیدنظر ثبت شد.", "success"); setOpen(false); router.refresh(); }
    else toast.show(j.message || "خطا در ثبت درخواست", "error");
  }
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>درخواست تجدیدنظر</button>;
  return <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
    <input className="input" style={{ width: 200 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل اعتراض"/>
    <button className="btn btn-primary" onClick={submit}>ارسال</button>
  </div>;
}
