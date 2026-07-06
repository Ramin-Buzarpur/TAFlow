"use client";
import { useState } from "react";

export function SurveyBuilder({ offerings }: { offerings: { id: string; title: string }[] }) {
  const [msg, setMsg] = useState("");
  async function submit(fd: FormData) {
    setMsg("در حال ثبت...");
    const questions = String(fd.get("questions") || "")
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean)
      .map((text) => ({ text, type: "RATING" as const, required: true }));
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
    <select className="select" name="courseOfferingId" required>
      {offerings.length ? offerings.map((o) => <option key={o.id} value={o.id}>{o.title}</option>) : <option value="">درسی در دسترس نیست</option>}
    </select>
    <input className="input" name="title" placeholder="عنوان ارزیابی" required />
    <select className="select" name="type" defaultValue="COURSE_FEEDBACK">
      <option value="PROFESSOR_EVALUATION">ارزشیابی استاد</option>
      <option value="TA_MIDTERM">ارزشیابی TA (میان‌ترم)</option>
      <option value="TA_FINAL">ارزشیابی TA (پایان‌ترم)</option>
      <option value="COURSE_FEEDBACK">بازخورد درس</option>
    </select>
    <textarea className="textarea" name="description" placeholder="توضیح" />
    <textarea className="textarea" name="questions" placeholder={"هر خط یک سوال بنویسید، مثلا:\nکیفیت توضیح دادن\nپاسخ‌گویی به سوالات"} required />
    <input className="input" name="minResponses" type="number" placeholder="حداقل تعداد پاسخ برای نمایش نتایج" defaultValue={5} />
    <input className="input" name="opensAt" type="datetime-local" required />
    <input className="input" name="closesAt" type="datetime-local" required />
    <button className="btn btn-primary">انتشار ارزیابی</button>
    {msg ? <p className="muted">{msg}</p> : null}
  </form>;
}

export function SurveyResultsViewer() {
  const [surveyId, setSurveyId] = useState("");
  const [result, setResult] = useState<{
    hidden: boolean;
    responseCount: number;
    minResponses?: number;
    survey?: {
      id: string;
      title: string;
      description?: string | null;
      isAnonymous?: boolean;
      minResponses?: number;
      questions?: Array<{
        id: string;
        text: string;
        type: string;
        responseCount: number;
        ratingAverage: number | null;
        optionCounts: Array<{ label: string; count: number }>;
        textResponseCount: number;
      }>;
    };
  } | null>(null);
  const [msg, setMsg] = useState("");

  async function load(fd: FormData) {
    setMsg("در حال بارگذاری...");
    const nextSurveyId = String(fd.get("surveyId") || "").trim();
    setSurveyId(nextSurveyId);
    const res = await fetch(`/api/surveys/${nextSurveyId}/results`);
    const json = await res.json();
    if (res.ok) {
      setResult(json);
      setMsg("");
    } else {
      setMsg(json.message || "خطا در بارگذاری نتایج");
      setResult(null);
    }
  }

  return <div className="stack">
    <form className="form" action={load}>
      <input className="input" name="surveyId" placeholder="شناسه ارزیابی" required defaultValue={surveyId} />
      <button className="btn" type="submit">مشاهده نتایج</button>
    </form>
    {msg ? <p className="muted">{msg}</p> : null}
    {result ? (result.hidden
      ? <p className="muted">تعداد پاسخ ({result.responseCount}) هنوز به حداقل ({result.minResponses}) نرسیده است.</p>
      : <div className="stack">
        <div className="list-row" style={{ border: "none", padding: 0 }}>
          <div>
            <p><strong>{result.survey?.title}</strong></p>
            <p className="muted">{result.responseCount} پاسخ · حداقل لازم: {result.minResponses}</p>
          </div>
          {result.survey?.id ? <a className="btn" href={`/api/surveys/${result.survey.id}/export`}>خروجی CSV</a> : null}
        </div>
        {result.survey?.description ? <p className="muted">{result.survey.description}</p> : null}
        <section className="grid grid-2">
          {result.survey?.questions?.map((question) => (
            <div key={question.id} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 8 }}>
              <div className="list-row" style={{ border: "none", padding: 0, marginBottom: 10 }}>
                <strong>{question.text}</strong>
                <span className="muted">{question.type}</span>
              </div>
              <p className="muted">تعداد پاسخ: {question.responseCount}</p>
              {question.type === "RATING" ? <p>میانگین: {question.ratingAverage != null ? question.ratingAverage.toFixed(2) : "—"}</p> : null}
              {question.type === "TEXT" ? <p>پاسخ‌های متنی پنهان شده‌اند. تعداد پاسخ متنی: {question.textResponseCount}</p> : null}
              {question.optionCounts.length ? <div className="stack" style={{ marginTop: 10 }}>{question.optionCounts.map((option) => <div className="list-row" key={option.label}><span>{option.label}</span><strong>{option.count}</strong></div>)}</div> : null}
            </div>
          ))}
        </section>
      </div>
    ) : null}
  </div>;
}
