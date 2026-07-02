"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

type Applicant = {
  id: string;
  requestedRole: string;
  motivationText: string;
  status: string;
  score: number | null;
  applicant: { id: string; name: string | null; email: string; studentProfile: { studentNumber: string; gpa: number | null } | null };
};

export function ApplicantBoard({ applications }: { applications: Applicant[] }) {
  const [view, setView] = useState<"card" | "table">("card");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const router = useRouter();
  const toast = useToast();

  const filtered = useMemo(() => {
    const list = statusFilter === "ALL" ? applications : applications.filter((a) => a.status === statusFilter);
    return [...list].sort((a, b) => Number(b.score ?? -1) - Number(a.score ?? -1));
  }, [applications, statusFilter]);

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/ta-applications/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const json = await res.json();
    if (res.ok) { toast.show("وضعیت به‌روزرسانی شد.", "success"); router.refresh(); }
    else toast.show(json.message || "خطا در ثبت وضعیت", "error");
  }

  return <div>
    <div className="list-row" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <button className={`btn ${view === "card" ? "btn-primary" : ""}`} onClick={() => setView("card")}>نمای کارت</button>
        <button className={`btn ${view === "table" ? "btn-primary" : ""}`} onClick={() => setView("table")}>نمای جدول</button>
      </div>
      <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 220 }}>
        <option value="ALL">همه وضعیت‌ها</option>
        <option value="SUBMITTED">ارسال‌شده</option>
        <option value="UNDER_REVIEW">در حال بررسی</option>
        <option value="SHORTLISTED">Shortlist</option>
        <option value="INTERVIEW_INVITED">دعوت به مصاحبه</option>
        <option value="ACCEPTED">پذیرفته‌شده</option>
        <option value="REJECTED">ردشده</option>
      </select>
    </div>

    {view === "card" ? <section className="grid grid-3">
      {filtered.map((a) => <div className="card" key={a.id}>
        <div className="list-row" style={{ border: "none", padding: 0, marginBottom: 10 }}><strong>{a.applicant.name || a.applicant.email}</strong><StatusBadge status={a.status}/></div>
        <p className="muted">{a.applicant.studentProfile?.studentNumber} · معدل {a.applicant.studentProfile?.gpa != null ? a.applicant.studentProfile.gpa.toFixed(2) : "-"}</p>
        <Badge tone="gray">{a.requestedRole}</Badge>
        {a.score !== null ? <p className="muted">امتیاز: {Number(a.score).toFixed(1)}</p> : null}
        <p style={{ fontSize: 14 }}>{a.motivationText.slice(0, 140)}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <Link className="btn" href={`/applications/${a.id}`}>جزئیات</Link>
          <button className="btn" onClick={() => changeStatus(a.id, "SHORTLISTED")}>Shortlist</button>
          <button className="btn btn-primary" onClick={() => changeStatus(a.id, "ACCEPTED")}>قبول</button>
          <button className="btn" onClick={() => changeStatus(a.id, "REJECTED")}>رد</button>
        </div>
      </div>)}
    </section> : <table className="table">
      <thead><tr><th>متقاضی</th><th>شماره دانشجویی</th><th>نقش درخواستی</th><th>امتیاز</th><th>وضعیت</th><th>عملیات</th></tr></thead>
      <tbody>{filtered.map((a) => <tr key={a.id}>
        <td>{a.applicant.name || a.applicant.email}</td>
        <td>{a.applicant.studentProfile?.studentNumber}</td>
        <td>{a.requestedRole}</td>
        <td>{a.score !== null ? Number(a.score).toFixed(1) : "-"}</td>
        <td><StatusBadge status={a.status}/></td>
        <td style={{ display: "flex", gap: 6 }}>
          <Link className="btn" href={`/applications/${a.id}`}>جزئیات</Link>
          <button className="btn btn-primary" onClick={() => changeStatus(a.id, "ACCEPTED")}>قبول</button>
          <button className="btn" onClick={() => changeStatus(a.id, "REJECTED")}>رد</button>
        </td>
      </tr>)}</tbody>
    </table>}
  </div>;
}
