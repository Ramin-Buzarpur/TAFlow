"use client";
import { useState } from "react";

export function ProfileForm({ name, timezone }: { name: string; timezone: string }) {
  const [msg, setMsg] = useState("");
  async function submit(fd: FormData) {
    setMsg("در حال ذخیره...");
    const res = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: fd.get("name"), timezone: fd.get("timezone") }) });
    const json = await res.json();
    setMsg(res.ok ? "ذخیره شد." : json.message || "خطا در ذخیره‌سازی");
  }
  return <form className="form" action={submit}>
    <input className="input" name="name" defaultValue={name} placeholder="نام و نام خانوادگی"/>
    <input className="input" name="timezone" defaultValue={timezone} placeholder="منطقه زمانی"/>
    <button className="btn btn-primary">ذخیره تغییرات</button>
    {msg ? <p className="muted">{msg}</p> : null}
  </form>;
}

export function PasswordForm() {
  const [msg, setMsg] = useState("");
  async function submit(fd: FormData) {
    setMsg("در حال ثبت...");
    const res = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: fd.get("currentPassword"), newPassword: fd.get("newPassword") }) });
    const json = await res.json();
    setMsg(res.ok ? "رمز عبور تغییر کرد. نشست‌های قبلی خاتمه یافت." : json.message || "خطا در تغییر رمز");
  }
  return <form className="form" action={submit}>
    <input className="input" name="currentPassword" type="password" placeholder="رمز عبور فعلی"/>
    <input className="input" name="newPassword" type="password" placeholder="رمز عبور جدید"/>
    <button className="btn btn-primary">تغییر رمز عبور</button>
    {msg ? <p className="muted">{msg}</p> : null}
  </form>;
}
