"use client";
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge, Badge } from "@/components/primitives";
import { useToast } from "@/components/toast";

type CustomFieldDef = { key: string; label: string; type: string; required: boolean };
type FormConfig = { builtIn: { studentNumber: boolean; gpa: boolean; priorGrade: boolean; resume: boolean }; customFields: CustomFieldDef[] };
type ApplicantContext = { studentNumber: string | null; gpa: number | null; priorGrades: { title: string; score: number; maxScore: number; semester: string }[] };

type Applicant = {
  id: string;
  requestedRole: string;
  motivationText: string;
  status: string;
  score: number | null;
  customFields: Record<string, string | number>;
  context: ApplicantContext;
  applicant: { id: string; name: string | null; email: string; studentProfile: { studentNumber: string; gpa: number | null } | null };
};

function ApplicantDetails({ applicant, formConfig }: { applicant: Applicant; formConfig: FormConfig }) {
  const hasCustom = formConfig.customFields.length > 0;
  const hasAny = formConfig.builtIn.studentNumber || formConfig.builtIn.gpa || formConfig.builtIn.priorGrade || hasCustom;
  if (!hasAny) return null;
  return <div className="stack" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 13 }}>
    {formConfig.builtIn.studentNumber ? <p><strong>شماره دانشجویی: </strong>{applicant.context.studentNumber ?? "-"}</p> : null}
    {formConfig.builtIn.gpa ? <p><strong>معدل کل: </strong>{applicant.context.gpa != null ? applicant.context.gpa.toFixed(2) : "-"}</p> : null}
    {formConfig.builtIn.priorGrade ? <div>
      <strong>نمرات قبلی در این درس: </strong>
      {applicant.context.priorGrades.length
        ? <ul style={{ margin: "4px 0 0 0", paddingInlineStart: 18 }}>{applicant.context.priorGrades.map((g, i) => <li key={i}>{g.title} ({g.semester}): {g.score}/{g.maxScore}</li>)}</ul>
        : <span className="muted"> سابقه‌ای یافت نشد</span>}
    </div> : null}
    {formConfig.customFields.map((field) => <p key={field.key}><strong>{field.label}: </strong>{applicant.customFields[field.key] ?? "-"}</p>)}
  </div>;
}

export function ApplicantBoard({ applications, formConfig }: { applications: Applicant[]; formConfig: FormConfig }) {
  const [view, setView] = useState<"card" | "table">("card");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const router = useRouter();
  const toast = useToast();

  const filtered = useMemo(() => {
    const list = statusFilter === "ALL" ? applications : applications.filter((a) => a.status === statusFilter);
    return [...list].sort((a, b) => Number(b.score ?? -1) - Number(a.score ?? -1));
  }, [applications, statusFilter]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

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
          <button className="btn" onClick={() => toggleExpanded(a.id)}>{expanded.has(a.id) ? "بستن اطلاعات" : "اطلاعات فرم"}</button>
          <button className="btn" onClick={() => changeStatus(a.id, "SHORTLISTED")}>Shortlist</button>
          <button className="btn btn-primary" onClick={() => changeStatus(a.id, "ACCEPTED")}>قبول</button>
          <button className="btn" onClick={() => changeStatus(a.id, "REJECTED")}>رد</button>
        </div>
        {expanded.has(a.id) ? <ApplicantDetails applicant={a} formConfig={formConfig}/> : null}
      </div>)}
    </section> : <table className="table">
      <thead><tr><th>متقاضی</th><th>شماره دانشجویی</th><th>نقش درخواستی</th><th>امتیاز</th><th>وضعیت</th><th>عملیات</th></tr></thead>
      <tbody>{filtered.map((a) => <Fragment key={a.id}>
        <tr>
          <td>{a.applicant.name || a.applicant.email}</td>
          <td>{a.applicant.studentProfile?.studentNumber}</td>
          <td>{a.requestedRole}</td>
          <td>{a.score !== null ? Number(a.score).toFixed(1) : "-"}</td>
          <td><StatusBadge status={a.status}/></td>
          <td style={{ display: "flex", gap: 6 }}>
            <Link className="btn" href={`/applications/${a.id}`}>جزئیات</Link>
            <button className="btn" onClick={() => toggleExpanded(a.id)}>{expanded.has(a.id) ? "بستن" : "اطلاعات فرم"}</button>
            <button className="btn btn-primary" onClick={() => changeStatus(a.id, "ACCEPTED")}>قبول</button>
            <button className="btn" onClick={() => changeStatus(a.id, "REJECTED")}>رد</button>
          </td>
        </tr>
        {expanded.has(a.id) ? <tr><td colSpan={6}><ApplicantDetails applicant={a} formConfig={formConfig}/></td></tr> : null}
      </Fragment>)}</tbody>
    </table>}
  </div>;
}
