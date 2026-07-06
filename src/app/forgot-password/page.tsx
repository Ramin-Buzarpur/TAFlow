import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { safeInternalPath } from "@/lib/safe-path";
import { Topbar, Card } from "@/components/ui";
import { ForgotPasswordForm } from "./ui";

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<{ email?: string; returnTo?: string }> }) {
  const session = await auth();
  const query = (await searchParams) || {};
  const returnTo = safeInternalPath(query.returnTo, "/dashboard");
  if (session?.user?.id) redirect(returnTo);

  return (
    <>
      <Topbar />
      <main className="shell">
        <Card style={{ marginTop: 40 }}>
          <h1>بازیابی رمز عبور</h1>
          <p className="muted">ایمیل را وارد کنید تا اگر حسابی با آن وجود داشته باشد، لینک بازیابی برایتان ارسال شود.</p>
          <ForgotPasswordForm initialEmail={query.email || ""} returnTo={returnTo} />
        </Card>
      </main>
    </>
  );
}

