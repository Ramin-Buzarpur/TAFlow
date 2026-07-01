"use client";
import { useState } from "react";
export function EvaluationForm({ courseOfferingId }: { courseOfferingId: string }) {
  const [msg, setMsg] = useState("");
  async function submit(fd: FormData) {
    setMsg("در حال ثبت...");
    const res = await fetch("/api/evaluations/professor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseOfferingId, ratingTeaching: Number(fd.get("ratingTeaching")), ratingFairness: Number(fd.get("ratingFairness")), ratingResources: Number(fd.get("ratingResources")), comment: fd.get("comment") || undefined }) });
    const json = await res.json();
    setMsg(res.ok ? "با تشکر، ارزشیابی شما ثبت شد." : json.message || "خطا در ثبت ارزشیابی");
  }
  return <form className="form" action={submit}>
    <label className="muted">تسلط علمی و کیفیت تدریس</label>
    <select className="select" name="ratingTeaching" defaultValue="5"><option value="5">۵ - عالی</option><option value="4">۴</option><option value="3">۳</option><option value="2">۲</option><option value="1">۱ - ضعیف</option></select>
    <label className="muted">عدالت در نمره‌دهی</label>
    <select className="select" name="ratingFairness" defaultValue="5"><option value="5">۵ - عالی</option><option value="4">۴</option><option value="3">۳</option><option value="2">۲</option><option value="1">۱ - ضعیف</option></select>
    <label className="muted">کیفیت منابع آموزشی</label>
    <select className="select" name="ratingResources" defaultValue="5"><option value="5">۵ - عالی</option><option value="4">۴</option><option value="3">۳</option><option value="2">۲</option><option value="1">۱ - ضعیف</option></select>
    <textarea className="textarea" name="comment" placeholder="نظر تشریحی (اختیاری)"/>
    <button className="btn btn-primary">ثبت ارزشیابی ناشناس</button>
    {msg ? <p className="muted">{msg}</p> : null}
  </form>;
}
