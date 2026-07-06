"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { safeInternalPath } from "@/lib/safe-path";

type Props = { returnTo?: string };

export function LoginForm({ returnTo = "/dashboard" }: Props) {
  const safeReturnTo = useMemo(() => safeInternalPath(returnTo, "/dashboard"), [returnTo]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("در حال ورود...");
    const res = await signIn("credentials", {
      email,
      password,
      totpCode: totpCode.trim() || undefined,
      recoveryCode: recoveryCode.trim() || undefined,
      redirect: false,
      callbackUrl: safeReturnTo
    });
    setLoading(false);
    setPassword("");
    setTotpCode("");
    setRecoveryCode("");
    if (res?.ok) {
      window.location.assign(safeReturnTo);
      return;
    }
    setMessage("ورود ناموفق بود. ایمیل، رمز، وضعیت حساب یا کد دومرحله‌ای را بررسی کنید.");
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>
        <span className="muted">ایمیل</span>
        <input className="input" name="email" type="email" autoComplete="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        <span className="muted">رمز عبور</span>
        <input className="input" name="password" type="password" autoComplete="current-password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <label>
          <span className="muted">کد 2FA</span>
          <input className="input" name="totpCode" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} />
        </label>
        <label>
          <span className="muted">کد بازیابی</span>
          <input className="input" name="recoveryCode" autoCapitalize="characters" placeholder="ABCD-EFGH-IJKL" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())} />
        </label>
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "در حال ورود..." : "ورود"}
      </button>
      <div className="stack" style={{ gap: 6 }}>
        <p className="muted">اگر حساب شما نیاز به 2FA دارد، یکی از کدهای بالا را وارد کنید.</p>
        <p className="muted"><Link href="/forgot-password">رمز عبور را فراموش کرده‌اید؟</Link> · <Link href="/auth/2fa">فعال‌سازی 2FA کارکنان</Link></p>
      </div>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
