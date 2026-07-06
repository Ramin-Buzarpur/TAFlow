"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { safeInternalPath } from "@/lib/safe-path";

type Props = { returnTo?: string };

type RegisterResponse = {
  user?: { email: string; status: string };
  verificationToken?: string;
};

export function RegisterForm({ returnTo = "/dashboard" }: Props) {
  const safeReturnTo = useMemo(() => safeInternalPath(returnTo, "/dashboard"), [returnTo]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("در حال ثبت‌نام...");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, studentNumber: studentNumber || undefined, returnTo: safeReturnTo })
    });
    const json = (await response.json()) as RegisterResponse & { message?: string };
    setLoading(false);
    setPassword("");
    if (!response.ok) {
      setMessage(json.message || "ثبت‌نام انجام نشد.");
      return;
    }
    if (json.user?.status === "PENDING_EMAIL") {
      setPendingEmail(email);
      setMessage("ثبت‌نام انجام شد. برای فعال‌سازی، ایمیل تایید را بررسی کنید.");
      return;
    }
    setPendingEmail("");
    setMessage("حساب ساخته شد. اکنون می‌توانید وارد شوید.");
  }

  return (
    <div className="stack">
      <form className="form" onSubmit={submit}>
        <label>
          <span className="muted">نام و نام خانوادگی</span>
          <input className="input" name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="نام" required />
        </label>
        <label>
          <span className="muted">ایمیل</span>
          <input className="input" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ایمیل" required />
        </label>
        <label>
          <span className="muted">شماره دانشجویی</span>
          <input className="input" name="studentNumber" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="شماره دانشجویی" />
        </label>
        <label>
          <span className="muted">رمز عبور</span>
          <input className="input" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="رمز عبور قوی" required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
        </button>
        {message ? <p className="muted">{message}</p> : null}
      </form>
      {pendingEmail ? (
        <div className="list-row">
          <div>
            <strong>تایید ایمیل در انتظار است</strong>
            <p className="muted">اگر ایمیل را دریافت نکردید، از صفحه تایید ایمیل برای ارسال دوباره استفاده کنید.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn" href={`/verify-email?email=${encodeURIComponent(pendingEmail)}`}>تایید ایمیل</Link>
            <Link className="btn" href={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`}>ورود</Link>
          </div>
        </div>
      ) : null}
      <p className="muted">قبلاً حساب دارید؟ <Link href={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`}>ورود</Link></p>
    </div>
  );
}
