import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return <><header className="topbar"><div className="shell nav">
    <Link className="brand" href="/"><span className="logo"/><span>سامانه مدیریت دستیار آموزشی</span></Link>
  </div></header><main className="shell">
    <div style={{ padding: "60px 0" }}>
      <EmptyState title="صفحه پیدا نشد (۴۰۴)" text="آدرسی که وارد کرده‌اید وجود ندارد یا جابه‌جا شده است."/>
      <div style={{ textAlign: "center", marginTop: 18 }}><Link className="btn btn-primary" href="/dashboard">بازگشت به داشبورد</Link></div>
    </div>
  </main></>;
}
