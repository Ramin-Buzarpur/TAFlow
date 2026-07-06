"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toDataURL } from "qrcode";

type AccountProfile = {
  email: string;
  globalRole: string;
  status: string;
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean;
};

type SetupResponse = {
  methodId: string;
  secret: string;
  otpauthUrl: string;
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { res, json: json as { message?: string; error?: string; recoveryCodes?: string[] } & Partial<SetupResponse> };
}

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { res, json: json as { message?: string; error?: string } };
}

async function maybeSignOut() {
  await signOut({ redirect: false, callbackUrl: "/login" });
}

export function ProfileForm({ name, timezone }: { name: string; timezone: string }) {
  const [formName, setFormName] = useState(name);
  const [formTimezone, setFormTimezone] = useState(timezone);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("در حال ذخیره...");
    const { res, json } = await patchJson("/api/account/profile", {
      name: formName,
      timezone: formTimezone
    });
    setLoading(false);
    setMessage(res.ok ? "ذخیره شد." : json.message || "خطا در ذخیره‌سازی");
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>
        <span className="muted">نام و نام خانوادگی</span>
        <input className="input" name="name" value={formName} onChange={(e) => setFormName(e.target.value)} autoComplete="name" placeholder="نام" />
      </label>
      <label>
        <span className="muted">منطقه زمانی</span>
        <input className="input" name="timezone" value={formTimezone} onChange={(e) => setFormTimezone(e.target.value)} placeholder="Asia/Tehran" />
      </label>
      <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (newPassword !== confirmPassword) {
      setMessage("رمز عبور جدید و تکرار آن یکسان نیست.");
      return;
    }
    setLoading(true);
    setMessage("در حال ثبت...");
    const { res, json } = await postJson("/api/account/password", {
      currentPassword,
      newPassword
    });
    setLoading(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(res.ok ? "رمز عبور تغییر کرد. نشست‌های قبلی خاتمه یافت." : json.message || "خطا در تغییر رمز");
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>
        <span className="muted">رمز عبور فعلی</span>
        <input className="input" name="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="رمز عبور فعلی" required />
      </label>
      <label>
        <span className="muted">رمز عبور جدید</span>
        <input className="input" name="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="رمز عبور جدید" required />
      </label>
      <label>
        <span className="muted">تکرار رمز عبور جدید</span>
        <input className="input" name="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="تکرار رمز عبور جدید" required />
      </label>
      <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "در حال ثبت..." : "تغییر رمز عبور"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}

export function TwoFactorPanel({ profile }: { profile: AccountProfile }) {
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "codes">("idle");
  const [label, setLabel] = useState("Authenticator app");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [qr, setQr] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const canManage = profile.status === "ACTIVE";
  const isStaffRequired = profile.twoFactorRequired;

  async function startSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !canManage) return;
    setLoading(true);
    setMessage("در حال ساخت secret...");
    const { res, json } = await postJson("/api/auth/2fa/setup", { label });
    setLoading(false);
    if (!res.ok) {
      setMessage(json.message || "امکان شروع فعال‌سازی وجود ندارد.");
      return;
    }
    setQr("");
    setSetup({
      methodId: json.methodId || "",
      secret: json.secret || "",
      otpauthUrl: json.otpauthUrl || ""
    });
    try {
      setQr(await toDataURL(json.otpauthUrl || ""));
    } catch {
      setQr("");
    }
    setRecoveryCodes(null);
    setCode("");
    setStep("setup");
    setMessage("secret آماده است. آن را در برنامه احراز هویت ثبت کنید و سپس کد شش‌رقمی را وارد کنید.");
  }

  async function confirmSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup || loading || !canManage) return;
    setLoading(true);
    setMessage("در حال تایید...");
    const { res, json } = await postJson("/api/auth/2fa/verify", {
      methodId: setup.methodId,
      code
    });
    setLoading(false);
    setCode("");
    if (!res.ok) {
      setMessage(json.message || "کد تایید نامعتبر است.");
      return;
    }
    setStep("codes");
    setRecoveryCodes(json.recoveryCodes || []);
    setSetup(null);
    setQr("");
    setMessage("2FA فعال شد. کدهای بازیابی فقط همین‌بار نمایش داده می‌شوند.");
    await maybeSignOut();
  }

  async function regenerateCodes() {
    if (loading || !canManage) return;
    setLoading(true);
    setMessage("در حال تولید کدهای جدید...");
    const { res, json } = await postJson("/api/auth/2fa/recovery-codes", {});
    setLoading(false);
    if (!res.ok) {
      setMessage(json.message || "امکان تولید مجدد کدهای بازیابی وجود ندارد.");
      return;
    }
    setStep("codes");
    setRecoveryCodes(json.recoveryCodes || []);
    setMessage("کدهای بازیابی جدید ساخته شد و قبلی‌ها باطل شدند.");
    await maybeSignOut();
  }

  async function disableTwoFactor() {
    if (loading || !canManage) return;
    setLoading(true);
    setMessage("در حال غیرفعال‌سازی...");
    const { res, json } = await postJson("/api/auth/2fa/disable", {});
    setLoading(false);
    if (!res.ok) {
      setMessage(json.message || "امکان غیرفعال‌سازی وجود ندارد.");
      return;
    }
    setStep("idle");
    setSetup(null);
    setQr("");
    setRecoveryCodes(null);
    setMessage("2FA غیرفعال شد و نشست‌های قبلی بسته شدند.");
    await maybeSignOut();
  }

  if (recoveryCodes) {
    return (
      <div className="stack">
        <div className="list-row">
          <div>
            <strong>کدهای بازیابی جدید</strong>
            <p className="muted">این کدها فقط همین‌بار نشان داده می‌شوند. آن‌ها را ذخیره کنید.</p>
          </div>
          <Link className="btn btn-primary" href="/login">
            بازگشت به ورود
          </Link>
        </div>
        <div className="grid grid-2">
          {recoveryCodes.map((item) => (
            <div className="list-row" key={item}>
              <code>{item}</code>
            </div>
          ))}
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    );
  }

  if (step === "setup" && setup) {
    return (
      <div className="stack">
        <div className="grid grid-2">
          <div className="stack">
            <div className="list-row" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>secret</strong>
                <p className="muted">فقط در زمان setup نمایش داده می‌شود.</p>
                <code style={{ display: "block", marginTop: 8, wordBreak: "break-all" }}>{setup.secret}</code>
              </div>
            </div>
            {qr ? <img src={qr} alt="QR code for authenticator app" style={{ width: 240, height: 240, borderRadius: 16, border: "1px solid var(--line)", background: "white", padding: 12 }} /> : null}
          </div>
          <div className="stack">
            <div className="list-row" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>URL راه‌اندازی</strong>
                <p className="muted">این مقدار را در Google Authenticator، 1Password، Authy یا ابزار مشابه وارد کنید.</p>
                <code style={{ display: "block", marginTop: 8, wordBreak: "break-all" }}>{setup.otpauthUrl}</code>
              </div>
            </div>
            <form className="form" onSubmit={confirmSetup}>
              <label>
                <span className="muted">کد تایید شش‌رقمی</span>
                <input className="input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required />
              </label>
              <button className="btn btn-primary" type="submit" disabled={loading} aria-busy={loading}>
                {loading ? "در حال تایید..." : "تایید و فعال‌سازی"}
              </button>
            </form>
          </div>
        </div>
        <p className="muted">اگر کد درست نباشد، 2FA فعال نمی‌شود و همین‌جا می‌توانید دوباره تلاش کنید.</p>
      </div>
    );
  }

  if (profile.twoFactorEnabled) {
    return (
      <div className="stack">
        <div className="list-row" style={{ alignItems: "flex-start" }}>
          <div>
            <strong>2FA فعال است</strong>
            <p className="muted">
              {isStaffRequired
                ? "این حساب در سیاست فعلی به 2FA نیاز دارد."
                : "می‌توانید کدهای بازیابی را نوسازی یا 2FA را غیرفعال کنید."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" type="button" onClick={regenerateCodes} disabled={loading || !canManage}>
              {loading ? "در حال پردازش..." : "تولید مجدد کدهای بازیابی"}
            </button>
            <button className="btn" type="button" onClick={disableTwoFactor} disabled={loading || !canManage}>
              غیرفعال‌سازی 2FA
            </button>
          </div>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="stack">
      <form className="form" onSubmit={startSetup}>
        <label>
          <span className="muted">برچسب دستگاه</span>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Authenticator app" required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading || !canManage} aria-busy={loading}>
          {loading ? "در حال شروع..." : "شروع فعال‌سازی 2FA"}
        </button>
      </form>
      {profile.twoFactorRequired ? (
        <p className="muted">این حساب در سیاست فعلی نیازمند 2FA است. اگر هنوز فعال نشده، از مسیر فعال‌سازی استفاده کنید.</p>
      ) : (
        <p className="muted">فعال‌سازی برای این حساب اختیاری است و فقط در صورت نیاز می‌توانید آن را روشن کنید.</p>
      )}
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
