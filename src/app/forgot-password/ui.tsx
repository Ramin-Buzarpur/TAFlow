"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { safeInternalPath } from "@/lib/safe-path";

type Props = { initialEmail: string; returnTo?: string };

export function ForgotPasswordForm({ initialEmail, returnTo = "/dashboard" }: Props) {
  const safeReturnTo = useMemo(() => safeInternalPath(returnTo, "/dashboard"), [returnTo]);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("در حال ارسال...");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setLoading(false);
    setMessage(res.ok ? "اگر این ایمیل در سامانه وجود داشته باشد، لینک بازیابی ارسال می‌شود." : "در حال حاضر امکان ارسال درخواست وجود ندارد.");
  }

  return (
    <div className="stack">
      <form className="form" onSubmit={submit}>
        <label>
          <span className="muted">ایمیل</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ایمیل" required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>{loading ? "در حال ارسال..." : "ارسال لینک بازیابی"}</button>
      </form>
      <p className="muted">پس از ارسال، یک لینک زمان‌دار برای بازنشانی رمز دریافت می‌کنید. برای امنیت، وجود یا عدم وجود حساب نمایش داده نمی‌شود.</p>
      <p className="muted"><Link href={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`}>بازگشت به ورود</Link> · <Link href="/verify-email">تایید ایمیل</Link></p>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
