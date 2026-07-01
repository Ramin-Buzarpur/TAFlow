"use client";
import { useState } from "react";
export function ApplicationActions({ id }: { id: string }) {
  const [msg, setMsg] = useState("");
  async function patch(status: string) { setMsg("در حال ثبت..."); const res = await fetch(`/api/ta-applications/${id}/status`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status }) }); const json = await res.json(); setMsg(res.ok ? "ثبت شد." : json.message); }
  return <div className="stack"><button className="btn" onClick={() => patch("UNDER_REVIEW")}>در حال بررسی</button><button className="btn" onClick={() => patch("SHORTLISTED")}>Shortlist</button><button className="btn" onClick={() => patch("INTERVIEW_INVITED")}>دعوت به مصاحبه</button><button className="btn btn-primary" onClick={() => patch("ACCEPTED")}>قبول و ساخت نقش درس‌محور</button><button className="btn" onClick={() => patch("REJECTED")}>رد درخواست</button>{msg ? <p className="muted">{msg}</p> : null}</div>;
}
