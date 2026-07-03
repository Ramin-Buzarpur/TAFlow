"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { JalaliHint } from "@/components/jalali-hint";
import { useToast } from "@/components/toast";

type CustomField = { key: string; label: string; type: "TEXT" | "TEXTAREA" | "NUMBER"; required: boolean };

export function NewOpportunityForm({ offerings }: { offerings: { id: string; title: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [studentNumber, setStudentNumber] = useState(false);
  const [gpa, setGpa] = useState(false);
  const [priorGrade, setPriorGrade] = useState(false);
  const [resume, setResume] = useState(true);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  function addCustomField() {
    setCustomFields((fields) => [...fields, { key: `field_${fields.length + 1}`, label: "", type: "TEXT", required: false }]);
  }
  function updateField(index: number, patch: Partial<CustomField>) {
    setCustomFields((fields) => fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function removeField(index: number) {
    setCustomFields((fields) => fields.filter((_, i) => i !== index));
  }

  async function submit(fd: FormData) {
    const res = await fetch("/api/ta-opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseOfferingId: fd.get("courseOfferingId"),
        title: fd.get("title"),
        description: fd.get("description"),
        requirements: fd.get("requirements"),
        needsHeadTA: fd.get("needsHeadTA") === "on",
        requiredTAs: Number(fd.get("requiredTAs")) || 1,
        opensAt: fd.get("opensAt") || undefined,
        deadline: fd.get("deadline"),
        formConfig: {
          builtIn: { studentNumber, gpa, priorGrade, resume },
          customFields: customFields.filter((f) => f.label.trim() && f.key.trim())
        }
      })
    });
    const json = await res.json();
    if (res.ok) { toast.show("فرصت ایجاد و منتشر شد.", "success"); router.push(`/opportunities/${json.id}`); }
    else toast.show(json.message || "خطا در ایجاد فرصت", "error");
  }
  return <form className="form card" action={submit}>
    <select className="select" name="courseOfferingId" required>
      <option value="">انتخاب ارائه درس</option>
      {offerings.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
    </select>
    <input className="input" name="title" placeholder="عنوان فرصت" required/>
    <textarea className="textarea" name="description" placeholder="توضیح فرصت" required/>
    <textarea className="textarea" name="requirements" placeholder="شرایط و مهارت‌های موردنیاز" required/>
    <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" name="needsHeadTA"/> این فرصت شامل Head TA هم می‌شود</label>
    <input className="input" name="requiredTAs" type="number" min={1} max={50} defaultValue={1} placeholder="تعداد نفرات موردنیاز"/>
    <div><label className="muted" style={{ fontSize: 13 }}>شروع دریافت درخواست (اختیاری)</label><input className="input" name="opensAt" type="datetime-local"/><JalaliHint inputName="opensAt"/></div>
    <div><label className="muted" style={{ fontSize: 13 }}>مهلت درخواست</label><input className="input" name="deadline" type="datetime-local" required/><JalaliHint inputName="deadline"/></div>

    <fieldset style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
      <legend style={{ padding: "0 8px" }}>تنظیم فرم درخواست</legend>
      <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>فیلدهای آماده از اطلاعات واقعی سامانه خوانده می‌شوند؛ فقط نمایش آن‌ها به داور را انتخاب کنید.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={studentNumber} onChange={(e) => setStudentNumber(e.target.checked)}/> شماره دانشجویی</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={gpa} onChange={(e) => setGpa(e.target.checked)}/> معدل کل</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={priorGrade} onChange={(e) => setPriorGrade(e.target.checked)}/> نمره‌ی قبلی متقاضی در این درس (در صورت وجود)</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={resume} onChange={(e) => setResume(e.target.checked)}/> دریافت فایل رزومه</label>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>فیلدهای سفارشی</strong>
        <button type="button" className="btn" onClick={addCustomField}>+ افزودن فیلد</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {customFields.map((field, i) => <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input className="input" style={{ flex: "1 1 180px" }} placeholder="عنوان فیلد (مثلا لینک گیت‌هاب)" value={field.label} onChange={(e) => updateField(i, { label: e.target.value, key: `field_${i}_${e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || i}` })}/>
          <select className="select" style={{ flex: "0 0 140px" }} value={field.type} onChange={(e) => updateField(i, { type: e.target.value as CustomField["type"] })}>
            <option value="TEXT">متن کوتاه</option>
            <option value="TEXTAREA">متن بلند</option>
            <option value="NUMBER">عدد</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}><input type="checkbox" checked={field.required} onChange={(e) => updateField(i, { required: e.target.checked })}/> الزامی</label>
          <button type="button" className="btn" onClick={() => removeField(i)}>حذف</button>
        </div>)}
        {customFields.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>فیلد سفارشی‌ای اضافه نشده است.</p> : null}
      </div>
    </fieldset>

    <button className="btn btn-primary">ایجاد و انتشار فرصت</button>
  </form>;
}
