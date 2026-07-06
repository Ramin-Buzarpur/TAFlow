"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { safeInternalPath } from "@/lib/safe-path";

type Props = { initialEmail: string; initialToken: string; returnTo?: string };

function isStrongPassword(value: string) {
  return (
    value.length >= 12 &&
    value.length <= 128 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^a-zA-Z0-9]/.test(value)
  );
}

export function ResetPasswordForm({ initialEmail, initialToken, returnTo = "/login" }: Props) {
  const safeReturnTo = useMemo(() => safeInternalPath(returnTo, "/login"), [returnTo]);
  const [email] = useState(initialEmail);
  const [token] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "invalid" | "success">("idle");

  useEffect(() => {
    if (token) window.history.replaceState({}, "", `/reset-password?email=${encodeURIComponent(email)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!token) {
      setStatus("invalid");
      setMessage("این لینک بازنشانی معتبر نیست یا منقضی شده است.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("رمز عبور و تکرار آن یکسان نیست.");
      return;
    }
    if (!isStrongPassword(password)) {
      setMessage("رمز عبور باید حداقل ۱۲ کاراکتر و شامل حروف کوچک، بزرگ، عدد و نماد باشد.");
      return;
    }
    setLoading(true);
    setMessage("در حال تغییر رمز...");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    setPassword("");
    setConfirmPassword("");
    if (res.ok) {
      setStatus("success");
      setMessage("رمز عبور با موفقیت تغییر کرد. حالا می‌توانید دوباره وارد شوید.");
      return;
    }
    setStatus("invalid");
    setMessage(json.message || "این لینک بازنشانی معتبر نیست یا منقضی شده است.");
  }

  if (status === "success") {
    return (
      <div className="list-row">
        <div>
          <strong>رمز عبور تغییر کرد</strong>
          <p className="muted">{message}</p>
        </div>
        <Link className="btn btn-primary" href="/login">ورود</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      {!token ? (
        <div className="list-row">
          <div>
            <strong>لینک نامعتبر</strong>
            <p className="muted">این لینک بازنشانی معتبر نیست یا منقضی شده است.</p>
          </div>
          <Link className="btn" href="/forgot-password">درخواست لینک جدید</Link>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>
            <span className="muted">ایمیل</span>
            <input className="input" type="email" value={email} readOnly />
          </label>
          <label>
            <span className="muted">رمز عبور جدید</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="رمز عبور جدید" required />
          </label>
          <label>
            <span className="muted">تکرار رمز عبور</span>
            <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="تکرار رمز عبور" required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>{loading ? "در حال تغییر..." : "تغییر رمز عبور"}</button>
          <p className="muted">رمز باید ۱۲ کاراکتر یا بیشتر باشد و حروف کوچک، بزرگ، عدد و نماد داشته باشد.</p>
        </form>
      )}
      <p className="muted"><Link href={`/login?returnTo=${encodeURIComponent(safeReturnTo)}`}>بازگشت به ورود</Link></p>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
