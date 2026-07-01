"use client";
import { useState } from "react";
export function ApplyOpportunityForm({ opportunityId }: { opportunityId: string }) {
  const [message, setMessage] = useState("");
  async function submit(formData: FormData) {
    setMessage("در حال ارسال...");
    const res = await fetch(`/api/ta-opportunities/${opportunityId}/applications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestedRole: formData.get("requestedRole"), motivationText: formData.get("motivationText") }) });
    const json = await res.json(); setMessage(res.ok ? "درخواست با موفقیت ثبت شد." : json.message || "خطا در ارسال درخواست");
  }
  return <form className="form" action={submit}><select className="select" name="requestedRole" defaultValue="TA"><option value="TA">TA</option><option value="HEAD_TA">Head TA</option><option value="EITHER">هر دو</option></select><textarea className="textarea" name="motivationText" placeholder="انگیزه و سابقه مرتبط خود را بنویسید..." required/><button className="btn btn-primary">ثبت درخواست</button>{message ? <p className="muted">{message}</p> : null}</form>;
}
