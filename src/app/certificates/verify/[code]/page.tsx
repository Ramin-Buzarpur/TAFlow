import { verifyCertificatePublic } from "@/server/services/certificates";
import { Topbar, Card, EmptyState } from "@/components/ui";
import { AppError } from "@/server/errors";

async function safeVerify(code: string) {
  try {
    return { ok: true as const, result: await verifyCertificatePublic(code) };
  } catch (error) {
    return { ok: false as const, message: error instanceof AppError ? error.message : "خطا در راستی‌آزمایی" };
  }
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const outcome = await safeVerify(code);

  if (!outcome.ok) {
    return <><Topbar/><main className="shell"><EmptyState title="گواهی نامعتبر یا ابطال‌شده" text={outcome.message}/></main></>;
  }

  const result = outcome.result;
  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>راستی‌آزمایی گواهی</h1><p className="muted">این صفحه به‌صورت عمومی در دسترس است و فقط اطلاعات محدود گواهی را نشان می‌دهد.</p></div></div>
    <Card style={{ maxWidth: 520 }}>
      <h2 style={{ color: "var(--success)" }}>✓ گواهی معتبر است</h2>
      <div className="stack">
        <div className="list-row"><span>نام</span><strong>{result.name}</strong></div>
        <div className="list-row"><span>نقش</span><strong>{result.role}</strong></div>
        <div className="list-row"><span>درس</span><strong>{result.course}</strong></div>
        <div className="list-row"><span>ترم</span><strong>{result.semester}</strong></div>
        <div className="list-row"><span>تاریخ صدور</span><strong>{new Date(result.issuedAt).toLocaleDateString("fa-IR")}</strong></div>
        <div className="list-row"><span>کد رهگیری</span><strong>{result.trackingCode}</strong></div>
      </div>
    </Card>
  </main></>;
}
