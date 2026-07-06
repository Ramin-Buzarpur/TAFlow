import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { markEmailVerified } from "@/server/services/users";
import { safeInternalPath } from "@/lib/safe-path";
import { Topbar, Card } from "@/components/ui";
import { VerifyEmailPanel } from "./ui";

export default async function VerifyEmailPage({ searchParams }: { searchParams?: Promise<{ email?: string; token?: string; returnTo?: string }> }) {
  const session = await auth();
  const query = (await searchParams) || {};
  const returnTo = safeInternalPath(query.returnTo, "/dashboard");
  if (session?.user?.id) redirect(returnTo);

  let initialStatus: "idle" | "verified" | "invalid" = "idle";
  let initialMessage = "";

  if (query.email && query.token) {
    try {
      await markEmailVerified(query.email, query.token);
      initialStatus = "verified";
      initialMessage = "ایمیل شما با موفقیت تایید شد. حالا می‌توانید وارد شوید.";
    } catch {
      initialStatus = "invalid";
      initialMessage = "لینک تایید معتبر نیست یا منقضی شده است.";
    }
  }

  return (
    <>
      <Topbar />
      <main className="shell">
        <Card style={{ marginTop: 40 }}>
          <h1>تایید ایمیل</h1>
          <p className="muted">لینک تایید را اینجا باز کنید یا در صورت نیاز، ایمیل را دوباره بفرستید.</p>
          <VerifyEmailPanel initialEmail={query.email || ""} returnTo={returnTo} initialStatus={initialStatus} initialMessage={initialMessage} />
        </Card>
      </main>
    </>
  );
}
