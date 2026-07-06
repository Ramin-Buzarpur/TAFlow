"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toDataURL } from "qrcode";

type SetupResponse = {
  methodId: string;
  setupToken: string;
  secret: string;
  otpauthUrl: string;
};

type ConfirmResponse = {
  ok: boolean;
  recoveryCodes?: string[];
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { res, json: json as { message?: string; error?: string } & SetupResponse & ConfirmResponse };
}

export function TwoFactorEnrollPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("Authenticator app");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [qr, setQr] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("در حال ساخت secret...");
    const { res, json } = await postJson("/api/auth/2fa/required-setup", { email, password, label });
    setLoading(false);
    setPassword("");
    if (!res.ok) {
      setMessage(json.message || "امکان شروع فعال‌سازی وجود ندارد.");
      return;
    }
    setSetup(json);
    try {
      setQr(await toDataURL(json.otpauthUrl || ""));
    } catch {
      setQr("");
    }
    setRecoveryCodes(null);
    setCode("");
    setMessage("secret آماده است. آن را در اپلیکیشن احراز هویت ثبت و سپس کد شش‌رقمی را تایید کنید.");
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup || loading) return;
    setLoading(true);
    setMessage("در حال تایید...");
    const { res, json } = await postJson("/api/auth/2fa/required-setup", { methodId: setup.methodId, setupToken: setup.setupToken, code });
    setLoading(false);
    setCode("");
    if (!res.ok) {
      setMessage(json.message || "کد تایید نامعتبر است.");
      return;
    }
    setRecoveryCodes(json.recoveryCodes || []);
    setSetup(null);
    setQr("");
    setMessage("2FA فعال شد. این کدهای بازیابی فقط همین‌بار نمایش داده می‌شوند.");
  }

  if (recoveryCodes) {
    return (
      <div className="stack">
        <div className="list-row">
          <div>
            <strong>2FA فعال شد</strong>
            <p className="muted">کدهای بازیابی را اکنون ذخیره کنید. بعداً دوباره نمایش داده نمی‌شوند.</p>
          </div>
          <Link className="btn btn-primary" href="/login">بازگشت به ورود</Link>
        </div>
        <div className="grid grid-2">
          {recoveryCodes.map((item) => <div className="list-row" key={item}><code>{item}</code></div>)}
        </div>
        <p className="muted">این کدها را در browser storage ذخیره نمی‌کنیم. اگر آن‌ها را از دست بدهید، باید از داخل حساب دوباره تولید کنید.</p>
      </div>
    );
  }

  if (setup) {
    return (
      <div className="stack">
        <div className="grid grid-2">
          <div className="stack">
            <div className="list-row" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>secret</strong>
                <p className="muted">آن را فقط در زمان setup می‌بینید.</p>
                <code style={{ display: "block", marginTop: 8, wordBreak: "break-all" }}>{setup.secret}</code>
              </div>
            </div>
            {qr ? <img src={qr} alt="QR code for authenticator app" style={{ width: 240, height: 240, borderRadius: 16, border: "1px solid var(--line)", background: "white", padding: 12 }} /> : null}
          </div>
          <div className="stack">
            <div className="list-row" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>کد ورود به اپلیکیشن</strong>
                <p className="muted">این secret را در Google Authenticator, 1Password, Authy یا ابزار مشابه وارد کنید.</p>
                <code style={{ display: "block", marginTop: 8, wordBreak: "break-all" }}>{setup.otpauthUrl}</code>
              </div>
            </div>
            <form className="form" onSubmit={confirm}>
              <label>
                <span className="muted">کد تایید شش‌رقمی</span>
                <input className="input" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required />
              </label>
              <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>{loading ? "در حال تایید..." : "تایید و فعال‌سازی"}</button>
            </form>
          </div>
        </div>
        <p className="muted">اگر کد درست نباشد، 2FA فعال نمی‌شود و می‌توانید همین‌جا دوباره تلاش کنید.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <form className="form" onSubmit={start}>
        <label>
          <span className="muted">ایمیل دانشگاهی</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ایمیل" required />
        </label>
        <label>
          <span className="muted">رمز عبور</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="رمز عبور" required />
        </label>
        <label>
          <span className="muted">برچسب دستگاه</span>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Authenticator app" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>{loading ? "در حال شروع..." : "شروع فعال‌سازی"}</button>
      </form>
      <p className="muted">اگر در حال تنظیم 2FA برای حسابی هستید که اجرای اجباری دارد، بعد از تایید موفق به صفحه ورود برمی‌گردید.</p>
      <p className="muted"><Link href="/login">بازگشت به ورود</Link></p>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
