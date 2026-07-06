"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { safeInternalPath } from "@/lib/safe-path";

type Props = { initialEmail: string; returnTo?: string; initialStatus?: "idle" | "verified" | "invalid"; initialMessage?: string };

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { res, json: json as { message?: string; error?: string } };
}

export function VerifyEmailPanel({ initialEmail, returnTo = "/dashboard", initialStatus = "idle", initialMessage = "" }: Props) {
  const safeReturnTo = useMemo(() => safeInternalPath(returnTo, "/dashboard"), [returnTo]);
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "verified" | "invalid" | "resend">(initialStatus);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("در حال ارسال دوباره...");
    const { res, json } = await postJson("/api/auth/resend-verification", { email });
    setLoading(false);
    setStatus("resend");
    setMessage(res.ok ? "اگر این ایمیل در سامانه وجود داشته باشد، لینک تایید دوباره ارسال می‌شود." : json.message || "امکان ارسال دوباره وجود ندارد.");
  }

  return (
    <div className="stack">
      {status === "verified" ? (
        <div className="list-row">
          <div>
            <strong>تایید انجام شد</strong>
            <p className="muted">{message}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`}>ورود</Link>
            <Link className="btn" href={`/register?returnTo=${encodeURIComponent(safeReturnTo)}`}>ثبت‌نام</Link>
          </div>
        </div>
      ) : null}

      {status !== "verified" ? (
        <form className="form" onSubmit={resend}>
          <label>
            <span className="muted">ایمیل</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ایمیل" required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>{loading ? "در حال ارسال..." : "ارسال دوباره تایید ایمیل"}</button>
          <p className="muted">اگر لینک قبلی منقضی شده یا قبلاً استفاده شده باشد، اینجا می‌توانید دوباره درخواست بفرستید.</p>
        </form>
      ) : null}

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
