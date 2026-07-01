"use client";
import Link from "next/link";
import { Topbar, EmptyState } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isPermission = /PERMISSION_DENIED|Access denied|Authentication is required/i.test(error.message);
  return <><Topbar/><main className="shell">
    <div style={{ padding: "60px 0" }}>
      <EmptyState
        title={isPermission ? "دسترسی غیرمجاز" : "خطایی رخ داد"}
        text={isPermission ? "شما اجازه دسترسی به این بخش را ندارید. اگر فکر می‌کنید این یک اشتباه است با مدیر سیستم تماس بگیرید." : "مشکلی در بارگذاری این صفحه پیش آمد. می‌توانید دوباره تلاش کنید."}
      />
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
        <button className="btn btn-primary" onClick={() => reset()}>تلاش دوباره</button>
        <Link className="btn" href="/dashboard">بازگشت به داشبورد</Link>
      </div>
    </div>
  </main></>;
}
