import Link from "next/link";
import { Topbar, EmptyState } from "@/components/ui";

export default function NotFound() {
  return <><Topbar/><main className="shell">
    <div style={{ padding: "60px 0" }}>
      <EmptyState title="صفحه پیدا نشد (۴۰۴)" text="آدرسی که وارد کرده‌اید وجود ندارد یا جابه‌جا شده است."/>
      <div style={{ textAlign: "center", marginTop: 18 }}><Link className="btn btn-primary" href="/dashboard">بازگشت به داشبورد</Link></div>
    </div>
  </main></>;
}
