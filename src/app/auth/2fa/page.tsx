import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { Topbar, Card } from "@/components/ui";
import { TwoFactorEnrollPanel } from "./ui";

export default async function TwoFactorEnrollPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/settings");

  return (
    <>
      <Topbar />
      <main className="shell">
        <Card style={{ marginTop: 40 }}>
          <h1>فعال‌سازی 2FA کارکنان</h1>
          <p className="muted">اگر حساب شما نیاز به 2FA دارد، از همین‌جا با ایمیل و رمز عبور، تنظیم را شروع و سپس با کد TOTP تایید کنید.</p>
          <TwoFactorEnrollPanel />
        </Card>
      </main>
    </>
  );
}

