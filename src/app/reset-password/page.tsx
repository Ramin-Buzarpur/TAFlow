import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { safeInternalPath } from "@/lib/safe-path";
import { Topbar, Card } from "@/components/ui";
import { ResetPasswordForm } from "./ui";

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<{ email?: string; token?: string; returnTo?: string }> }) {
  const session = await auth();
  const query = (await searchParams) || {};
  const returnTo = safeInternalPath(query.returnTo, "/dashboard");
  if (session?.user?.id) redirect(returnTo);

  return (
    <>
      <Topbar />
      <main className="shell">
        <Card style={{ marginTop: 40 }}>
          <h1>بازنشانی رمز عبور</h1>
          <p className="muted">رمز جدید را با همان لینک زمان‌دار وارد کنید. اگر لینک معتبر نباشد، هشدار امن نمایش داده می‌شود.</p>
          <ResetPasswordForm initialEmail={query.email || ""} initialToken={query.token || ""} returnTo={returnTo} />
        </Card>
      </main>
    </>
  );
}
