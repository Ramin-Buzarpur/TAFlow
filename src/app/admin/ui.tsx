"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JalaliHint } from "@/components/jalali-hint";
import { useToast } from "@/components/toast";

type HealthReport = { status: string; database: string; redis: string; storage: string; latencyMs: number; time: string };

function HealthDot({ ok }: { ok: boolean }) {
  return <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: ok ? "#22c55e" : "#ef4444", marginInlineEnd: 6 }}/>;
}

export function SystemHealthCard() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch("/api/health").then(async (res) => {
      const json = await res.json();
      if (!ignore) { setReport(json); setCheckedAt(new Date().toLocaleTimeString("fa-IR")); setLoading(false); }
    });
    return () => { ignore = true; };
  }, [refreshToken]);

  return <div className="stack">
    {report ? <div className="stack">
      <div className="list-row"><div><HealthDot ok={report.database === "ok"}/>پایگاه‌داده</div><span className="muted">{report.database}</span></div>
      <div className="list-row"><div><HealthDot ok={report.redis !== "error"}/>Redis</div><span className="muted">{report.redis === "not_configured" ? "پیکربندی نشده (in-memory)" : report.redis}</span></div>
      <div className="list-row"><div><HealthDot ok={report.storage === "ok"}/>ذخیره‌سازی فایل</div><span className="muted">{report.storage}</span></div>
      <p className="muted">تاخیر: {report.latencyMs} میلی‌ثانیه — آخرین بررسی: {checkedAt}</p>
    </div> : <p className="muted">در حال بررسی...</p>}
    <button className="btn" disabled={loading} onClick={() => { setLoading(true); setRefreshToken((t) => t + 1); }}>بررسی مجدد</button>
  </div>;
}

function useSubmit(url: string, buildBody: (fd: FormData) => unknown) {
  const router = useRouter();
  const toast = useToast();
  async function submit(fd: FormData) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBody(fd)) });
    const json = await res.json();
    if (res.ok) { toast.show("ثبت شد.", "success"); router.refresh(); }
    else toast.show(json.message || "خطا در ثبت", "error");
  }
  return { submit };
}

export function DepartmentForm() {
  const { submit } = useSubmit("/api/admin/departments", (fd) => ({ name: fd.get("name"), code: fd.get("code") }));
  return <form className="form" action={submit}><input className="input" name="name" placeholder="نام دانشکده" required/><input className="input" name="code" placeholder="کد" required/><button className="btn btn-primary">افزودن</button></form>;
}

export function SemesterForm() {
  const { submit } = useSubmit("/api/admin/semesters", (fd) => ({ title: fd.get("title"), code: fd.get("code"), startsAt: fd.get("startsAt"), endsAt: fd.get("endsAt") }));
  return <form className="form" action={submit}><input className="input" name="title" placeholder="عنوان ترم" required/><input className="input" name="code" placeholder="کد ترم" required/><div><input className="input" name="startsAt" type="date" required/><JalaliHint inputName="startsAt"/></div><div><input className="input" name="endsAt" type="date" required/><JalaliHint inputName="endsAt"/></div><button className="btn btn-primary">افزودن</button></form>;
}

export function CourseForm({ departments }: { departments: { id: string; name: string }[] }) {
  const { submit } = useSubmit("/api/admin/courses", (fd) => ({ title: fd.get("title"), code: fd.get("code"), departmentId: fd.get("departmentId") || undefined, units: Number(fd.get("units")) || 3 }));
  return <form className="form" action={submit}>
    <input className="input" name="title" placeholder="عنوان درس" required/>
    <input className="input" name="code" placeholder="کد درس" required/>
    <select className="select" name="departmentId" defaultValue=""><option value="">بدون دانشکده</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
    <input className="input" name="units" type="number" placeholder="تعداد واحد" defaultValue={3}/>
    <button className="btn btn-primary">افزودن</button>
  </form>;
}

export function CourseOfferingForm({ courses, semesters }: { courses: { id: string; title: string }[]; semesters: { id: string; title: string }[] }) {
  const { submit } = useSubmit("/api/admin/course-offerings", (fd) => ({ courseId: fd.get("courseId"), semesterId: fd.get("semesterId"), professorId: fd.get("professorId"), section: fd.get("section") || undefined, capacity: Number(fd.get("capacity")) || undefined }));
  return <form className="form" action={submit}>
    <select className="select" name="courseId" required><option value="">انتخاب درس</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
    <select className="select" name="semesterId" required><option value="">انتخاب ترم</option>{semesters.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
    <input className="input" name="professorId" placeholder="شناسه کاربری استاد" required/>
    <input className="input" name="section" placeholder="سکشن"/>
    <input className="input" name="capacity" type="number" placeholder="ظرفیت"/>
    <button className="btn btn-primary">ایجاد ارائه درس</button>
  </form>;
}

export function RoleAssignForm() {
  const router = useRouter();
  const toast = useToast();
  async function submit(fd: FormData) {
    const courseOfferingId = String(fd.get("courseOfferingId"));
    const res = await fetch(`/api/course-offerings/${courseOfferingId}/roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: fd.get("userId"), role: fd.get("role") }) });
    const json = await res.json();
    if (res.ok) { toast.show("نقش ثبت شد.", "success"); router.refresh(); }
    else toast.show(json.message || "خطا در ثبت نقش", "error");
  }
  return <form className="form" action={submit}>
    <input className="input" name="courseOfferingId" placeholder="شناسه ارائه درس"/>
    <input className="input" name="userId" placeholder="شناسه کاربر"/>
    <select className="select" name="role" defaultValue="TA"><option value="STUDENT">دانشجو</option><option value="TA">TA</option><option value="HEAD_TA">Head TA</option><option value="PROFESSOR">استاد</option></select>
    <button className="btn btn-primary">تخصیص نقش</button>
  </form>;
}
