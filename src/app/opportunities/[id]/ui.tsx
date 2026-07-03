"use client";
import { useState } from "react";
import { FileUpload } from "@/components/file-upload";

type CustomFieldDef = { key: string; label: string; type: string; required: boolean };

export function ApplyOpportunityForm({ opportunityId, showResume, customFields }: { opportunityId: string; showResume: boolean; customFields: CustomFieldDef[] }) {
  const [message, setMessage] = useState("");
  const [resumeFileId, setResumeFileId] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [motivationText, setMotivationText] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  async function submit(formData: FormData) {
    for (const field of customFields) {
      if (field.required && !fieldValues[field.key]?.trim()) { setMessage(`فیلد «${field.label}» الزامی است`); return; }
    }
    setMessage("در حال ارسال...");
    const res = await fetch(`/api/ta-opportunities/${opportunityId}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestedRole: formData.get("requestedRole"),
        motivationText,
        resumeFileId: showResume ? resumeFileId || undefined : undefined,
        customFields: Object.keys(fieldValues).length ? fieldValues : undefined
      })
    });
    const json = await res.json(); setMessage(res.ok ? "درخواست با موفقیت ثبت شد." : json.message || "خطا در ارسال درخواست");
  }
  return <form className="form" action={submit}>
    <select className="select" name="requestedRole" defaultValue="TA"><option value="TA">TA</option><option value="HEAD_TA">Head TA</option><option value="EITHER">هر دو</option></select>
    <textarea className="textarea" placeholder="انگیزه و سابقه مرتبط خود را بنویسید..." required value={motivationText} onChange={(e) => setMotivationText(e.target.value)}/>
    {customFields.map((field) => <div key={field.key}>
      <label className="muted" style={{ fontSize: 13 }}>{field.label}{field.required ? " *" : ""}</label>
      {field.type === "TEXTAREA"
        ? <textarea className="textarea" value={fieldValues[field.key] ?? ""} onChange={(e) => setFieldValues((v) => ({ ...v, [field.key]: e.target.value }))}/>
        : <input className="input" type={field.type === "NUMBER" ? "number" : "text"} value={fieldValues[field.key] ?? ""} onChange={(e) => setFieldValues((v) => ({ ...v, [field.key]: e.target.value }))}/>}
    </div>)}
    {showResume ? <>
      <FileUpload accept=".pdf,.doc,.docx" onUploaded={(id, name) => { setResumeFileId(id); setResumeName(name); }}/>
      {resumeName ? <p className="muted">رزومه پیوست‌شده: {resumeName}</p> : null}
    </> : null}
    <button className="btn btn-primary">ثبت درخواست</button>
    {message ? <p className="muted">{message}</p> : null}
  </form>;
}
