import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { safeInternalPath } from "@/lib/safe-path";
import { Topbar, Card } from "@/components/ui";
import { LoginForm } from "./ui";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ returnTo?: string }> }) {
  const session = await auth();
  const query = (await searchParams) || {};
  const returnTo = safeInternalPath(query.returnTo, "/dashboard");
  if (session?.user?.id) redirect(returnTo);

  return (
    <>
      <Topbar />
      <main className="shell">
        <section className="grid grid-2" style={{ marginTop: 40 }}>
          <Card>
            <h1>ورود به سامانه</h1>
            <p className="muted">با حساب دانشگاهی یا ایمیل و رمز وارد شوید. اگر 2FA دارید، کد TOTP یا کد بازیابی را هم وارد کنید.</p>
            <LoginForm returnTo={returnTo} />
          </Card>
          <Card>
            <h2>مسیرهای سریع</h2>
            <div className="stack">
              <div className="list-row">admin@example.edu</div>
              <div className="list-row">rezai@example.edu</div>
              <div className="list-row">headta@example.edu</div>
              <div className="list-row">student@example.edu</div>
              <p className="muted">رمز نمونه: Admin@12345678</p>
              <p className="muted"><Link href="/register">ثبت‌نام دانشجو</Link> · <Link href="/forgot-password">فراموشی رمز</Link> · <Link href="/verify-email">تایید ایمیل</Link> · <Link href="/auth/2fa">فعال‌سازی 2FA کارکنان</Link></p>
            </div>
          </Card>
        </section>
      </main>
    </>
  );
}
