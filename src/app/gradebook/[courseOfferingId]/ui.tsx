"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

export function GradebookForms({ courseOfferingId }: { courseOfferingId: string }) {
  const router = useRouter();
  const toast = useToast();
  async function cat(fd: FormData) {
    const res = await fetch("/api/gradebook/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseOfferingId, name: fd.get("name"), weight: Number(fd.get("weight")), maxScore: Number(fd.get("maxScore")) }) });
    const j = await res.json();
    if (res.ok) { toast.show("دسته ساخته شد.", "success"); router.refresh(); }
    else toast.show(j.message || "خطا در ساخت دسته", "error");
  }
  return <form className="form" action={cat}>
    <input className="input" name="name" placeholder="نام دسته مثل تمرین‌ها"/>
    <input className="input" name="weight" placeholder="وزن"/>
    <input className="input" name="maxScore" placeholder="حداکثر نمره"/>
    <button className="btn btn-primary">ساخت دسته نمره</button>
  </form>;
}

export function GradeItemLockToggle({ itemId, locked }: { itemId: string; locked: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/gradebook/items/${itemId}/lock`, { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (res.ok) { toast.show(json.lockedAt ? "آیتم قفل شد؛ نمرات آن دیگر قابل ویرایش نیستند." : "قفل آیتم باز شد.", "success"); router.refresh(); }
    else toast.show(json.message || "خطا در تغییر وضعیت قفل", "error");
  }
  return <button className="btn" disabled={busy} onClick={toggle} title={locked ? "باز کردن قفل" : "قفل کردن نمرات"} style={{ padding: "4px 10px", fontSize: 12 }}>
    {locked ? "🔒 قفل" : "🔓 باز"}
  </button>;
}

type PreviewRow = { row: number; studentNumber: string; score: number | null; status: "ok" | "error"; message?: string; studentId?: string };

export function GradeImportPanel({ items }: { items: { id: string; title: string }[] }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function preview(fd: FormData) {
    if (!itemId) { toast.show("ابتدا یک آیتم نمره انتخاب کنید.", "error"); return; }
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) { toast.show("یک فایل اکسل انتخاب کنید.", "error"); return; }
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/gradebook/items/${itemId}/import/preview`, { method: "POST", body });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { toast.show(json.message || "خطا در خواندن فایل", "error"); return; }
    setRows(json.data.rows);
  }

  async function commit() {
    if (!rows) return;
    const okRows = rows.filter((r) => r.status === "ok" && r.studentId && r.score !== null).map((r) => ({ studentId: r.studentId as string, score: r.score as number }));
    if (!okRows.length) { toast.show("ردیف معتبری برای ثبت وجود ندارد.", "error"); return; }
    setBusy(true);
    const res = await fetch(`/api/gradebook/items/${itemId}/import/commit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: okRows }) });
    const json = await res.json();
    setBusy(false);
    if (res.ok) { toast.show(`${okRows.length} نمره ثبت شد.`, "success"); setRows(null); router.refresh(); }
    else toast.show(json.message || "خطا در ثبت نمرات", "error");
  }

  const okCount = rows?.filter((r) => r.status === "ok").length ?? 0;
  const errorCount = rows?.filter((r) => r.status === "error").length ?? 0;

  return <div className="stack">
    <p className="muted" style={{ fontSize: 13 }}>فایل اکسل باید دو ستون داشته باشد: شماره دانشجویی یا ایمیل، و نمره. ردیف اول عنوان ستون‌هاست.</p>
    <select className="select" value={itemId} onChange={(e) => { setItemId(e.target.value); setRows(null); }}>
      {items.length ? items.map((i) => <option key={i.id} value={i.id}>{i.title}</option>) : <option value="">آیتم نمره‌ای وجود ندارد</option>}
    </select>
    <form className="form" action={preview}>
      <input className="input" type="file" name="file" accept=".xlsx,.xls"/>
      <button className="btn btn-primary" disabled={busy || !items.length}>{busy ? "در حال پردازش..." : "پیش‌نمایش"}</button>
    </form>
    {rows ? <>
      <p className="muted">{okCount} ردیف آماده ثبت، {errorCount} ردیف خطادار</p>
      <div className="stack" style={{ maxHeight: 260, overflowY: "auto" }}>
        {rows.map((r) => <div key={r.row} className="list-row" style={r.status === "error" ? { borderColor: "#fecaca" } : undefined}>
          <span>ردیف {r.row} — {r.studentNumber || "—"}</span>
          {r.status === "ok" ? <span style={{ color: "#047857", fontWeight: 800 }}>{r.score}</span> : <span style={{ color: "#b91c1c", fontSize: 12 }}>{r.message}</span>}
        </div>)}
      </div>
      <button className="btn btn-primary" onClick={commit} disabled={busy || !okCount}>ثبت {okCount} نمره</button>
    </> : null}
  </div>;
}
