"use client";
import { useState } from "react";

export function SurveyBuilder({ offerings }: { offerings: { id: string; title: string }[] }) {
  const [msg, setMsg] = useState("");
  async function submit(fd: FormData) {
    setMsg("در حال ثبت...");
    const questions = String(fd.get("questions") || "").split("\n").map((q) => q.trim()).filter(Boolean).map((text) => ({ text, type: "RATING" as const, required: true }));
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseOfferingId: fd.get("courseOfferingId"),
        title: fd.get("title"),
        description: fd.get("description") || undefined,
        type: fd.get("type"),
        isAnonymous: true,
        minResponses: Number(fd.get("minResponses")) || 5,
        opensAt: fd.get("opensAt"),
        closesAt: fd.get("closesAt"),
        questions: questions.length ? questions : [{ text: "میزان رضایت کلی", type: "RATING", required: true }]
      })
    });
    const j = await res.json();
    setMsg(res.ok ? `ارزیابی ساخته شد (شناسه: ${j.id})` : j.message || "خطا در ساخت ارزیابی");
  }
  return <form className="form" action={submit}>
    <select className="select" name="courseOfferingId" required>{offerings.length ? offerings.map((o) => <option key={o.id} value={o.id}>{o.title}</option>) : <option value="">درسی در دسترس نیست</option>}</select>
    <input className="input" name="title" placeholder="عنوان ارزیابی" required/>
    <select className="select" name="type" defaultValue="COURSE_FEEDBACK"><option value="PROFESSOR_EVALUATION">ارزشیابی استاد</option><option value="TA_MIDTERM">ارزشیابی TA (میان‌ترم)</option><option value="TA_FINAL">ارزشیابی TA (پایان‌ترم)</option><option value="COURSE_FEEDBACK">بازخورد درس</option></select>
    <textarea className="textarea" name="description" placeholder="توضیح"/>
    <textarea className="textarea" name="questions" placeholder={"هر خط یک سوال بنویسید، مثلاً:\nکیفیت توضیح دادن\nپاسخ‌گویی به سوالات"} required/>
    <input className="input" name="minResponses" type="number" placeholder="حداقل تعداد پاسخ برای نمایش نتایج" defaultValue={5}/>
    <input className="input" name="opensAt" type="datetime-local" required/>
    <input className="input" name="closesAt" type="datetime-local" required/>
    <button className="btn btn-primary">انتشار ارزیابی</button>
    {msg ? <p className="muted">{msg}</p> : null}
  </form>;
}

export function SurveyResultsViewer() {
  const [result, setResult] = useState<{ hidden: boolean; responseCount: number; minResponses?: number; survey?: { title: string; questions: { id: string; text: string }[] }; answers?: { questionId: string; valueJson: unknown }[] } | null>(null);
  const [msg, setMsg] = useState("");
  async function load(fd: FormData) {
    setMsg("در حال بارگذاری...");
    const res = await fetch(`/api/surveys/${fd.get("surveyId")}/results`);
    const json = await res.json();
    if (res.ok) { setResult(json); setMsg(""); } else { setMsg(json.message || "خطا در بارگذاری نتایج"); setResult(null); }
  }
  return <div className="stack">
    <form className="form" action={load}><input className="input" name="surveyId" placeholder="شناسه ارزیابی" required/><button className="btn">مشاهده نتایج</button></form>
    {msg ? <p className="muted">{msg}</p> : null}
    {result ? (result.hidden
      ? <p className="muted">تعداد پاسخ ({result.responseCount}) هنوز به حداقل ({result.minResponses}) نرسیده است.</p>
      : <div className="stack"><p><strong>{result.survey?.title}</strong> — {result.responseCount} پاسخ</p>{result.survey?.questions.map((q) => <div className="list-row" key={q.id}><span>{q.text}</span></div>)}</div>
    ) : null}
  </div>;
}
