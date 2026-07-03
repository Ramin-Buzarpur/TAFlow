import { auth } from "@/server/auth/auth";
import { getStudentGrades, listMyRegradeRequests, listMyAssignments } from "@/server/services/gradebook";
import { Topbar, Card, EmptyState, StatusBadge } from "@/components/ui";
import { DeliverableSubmit } from "@/components/deliverable-submit";
import { RegradeButton } from "./ui";
export default async function GradesPage(){const session=await auth(); if(!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای نمرات وارد شوید."/></main></>; const [rows, regradeRequests, assignments]=await Promise.all([getStudentGrades(session.user.id), listMyRegradeRequests(session.user.id), listMyAssignments(session.user.id)]); const openByRecord=new Set(regradeRequests.filter(r=>r.status==="OPEN").map(r=>r.gradeRecord.id)); return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>تکالیف و نمرات من</h1><p className="muted">مهلت تحویل تکالیف درس‌های ثبت‌نامی و نمرات منتشرشده.</p></div></div>

    <Card>
      <h2>تکالیف با مهلت تحویل</h2>
      {assignments.length ? <div className="stack">{assignments.map((a) => <div className="list-row" key={a.id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <div><strong>{a.title}</strong><p className="muted">{a.courseOffering.course.title} — موعد: {new Date(a.dueAt!).toLocaleDateString("fa-IR")}</p></div>
        </div>
        {a.submission ? <p className="muted" style={{ fontSize: 13 }}>آخرین تحویل: {a.submission.file.originalName}{a.dueAt && a.submission.submittedAt > a.dueAt ? <span style={{ marginInlineStart: 8, fontSize: 11, fontWeight: 800, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "2px 8px" }}>دیرکرد</span> : null}</p> : null}
        <DeliverableSubmit endpoint={`/api/gradebook/items/${a.id}/submit`} currentFileName={a.submission?.file.originalName}/>
      </div>)}</div> : <p className="muted">تکلیفی با مهلت تحویل ثبت نشده است.</p>}
    </Card>

    <Card style={{ marginTop: 20 }}><h2>نمرات منتشرشده</h2><table className="table"><thead><tr><th>درس</th><th>بخش</th><th>آیتم</th><th>نمره</th><th>وضعیت</th><th>تجدیدنظر</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.gradeItem.courseOffering.course.title}</td><td>{r.gradeItem.category.name}</td><td>{r.gradeItem.title}</td><td>{String(r.score)} / {String(r.gradeItem.maxScore)}</td><td><StatusBadge status={r.status}/></td><td>{openByRecord.has(r.id) ? <span className="muted">در انتظار پاسخ</span> : <RegradeButton gradeRecordId={r.id}/>}</td></tr>)}</tbody></table></Card>{regradeRequests.length ? <Card style={{ marginTop: 20 }}><h2>درخواست‌های تجدیدنظر من</h2><div className="stack">{regradeRequests.map(req=><div className="list-row" key={req.id}><div><strong>{req.gradeRecord.gradeItem.title}</strong><p className="muted">{req.reason}</p>{req.response ? <p className="muted">پاسخ: {req.response}</p> : null}</div><StatusBadge status={req.status}/></div>)}</div></Card> : null}
  </main></>}
