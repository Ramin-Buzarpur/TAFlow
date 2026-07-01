"use client";
import { useState } from "react";

function useSubmit(url: string, buildBody: (fd: FormData) => unknown) {
  const [msg, setMsg] = useState("");
  async function submit(fd: FormData) {
    setMsg("در حال ثبت...");
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBody(fd)) });
    const json = await res.json();
    setMsg(res.ok ? "ثبت شد." : json.message || "خطا در ثبت");
    if (res.ok) window.location.reload();
  }
  return { submit, msg };
}

export function DepartmentForm() {
  const { submit, msg } = useSubmit("/api/admin/departments", (fd) => ({ name: fd.get("name"), code: fd.get("code") }));
  return <form className="form" action={submit}><input className="input" name="name" placeholder="نام دانشکده" required/><input className="input" name="code" placeholder="کد" required/><button className="btn btn-primary">افزودن</button>{msg ? <p className="muted">{msg}</p> : null}</form>;
}

export function SemesterForm() {
  const { submit, msg } = useSubmit("/api/admin/semesters", (fd) => ({ title: fd.get("title"), code: fd.get("code"), startsAt: fd.get("startsAt"), endsAt: fd.get("endsAt") }));
  return <form className="form" action={submit}><input className="input" name="title" placeholder="عنوان ترم" required/><input className="input" name="code" placeholder="کد ترم" required/><input className="input" name="startsAt" type="date" required/><input className="input" name="endsAt" type="date" required/><button className="btn btn-primary">افزودن</button>{msg ? <p className="muted">{msg}</p> : null}</form>;
}

export function CourseForm({ departments }: { departments: { id: string; name: string }[] }) {
  const { submit, msg } = useSubmit("/api/admin/courses", (fd) => ({ title: fd.get("title"), code: fd.get("code"), departmentId: fd.get("departmentId") || undefined, units: Number(fd.get("units")) || 3 }));
  return <form className="form" action={submit}>
    <input className="input" name="title" placeholder="عنوان درس" required/>
    <input className="input" name="code" placeholder="کد درس" required/>
    <select className="select" name="departmentId" defaultValue=""><option value="">بدون دانشکده</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
    <input className="input" name="units" type="number" placeholder="تعداد واحد" defaultValue={3}/>
    <button className="btn btn-primary">افزودن</button>{msg ? <p className="muted">{msg}</p> : null}
  </form>;
}

export function CourseOfferingForm({ courses, semesters }: { courses: { id: string; title: string }[]; semesters: { id: string; title: string }[] }) {
  const { submit, msg } = useSubmit("/api/admin/course-offerings", (fd) => ({ courseId: fd.get("courseId"), semesterId: fd.get("semesterId"), professorId: fd.get("professorId"), section: fd.get("section") || undefined, capacity: Number(fd.get("capacity")) || undefined }));
  return <form className="form" action={submit}>
    <select className="select" name="courseId" required><option value="">انتخاب درس</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
    <select className="select" name="semesterId" required><option value="">انتخاب ترم</option>{semesters.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
    <input className="input" name="professorId" placeholder="شناسه کاربری استاد" required/>
    <input className="input" name="section" placeholder="سکشن"/>
    <input className="input" name="capacity" type="number" placeholder="ظرفیت"/>
    <button className="btn btn-primary">ایجاد ارائه درس</button>{msg ? <p className="muted">{msg}</p> : null}
  </form>;
}

export function RoleAssignForm() {
  const [msg, setMsg] = useState("");
  async function submit(fd: FormData) {
    setMsg("در حال ثبت...");
    const courseOfferingId = String(fd.get("courseOfferingId"));
    const res = await fetch(`/api/course-offerings/${courseOfferingId}/roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: fd.get("userId"), role: fd.get("role") }) });
    const json = await res.json();
    setMsg(res.ok ? "نقش ثبت شد." : json.message || "خطا در ثبت نقش");
  }
  return <form className="form" action={submit}>
    <input className="input" name="courseOfferingId" placeholder="شناسه ارائه درس"/>
    <input className="input" name="userId" placeholder="شناسه کاربر"/>
    <select className="select" name="role" defaultValue="TA"><option value="STUDENT">دانشجو</option><option value="TA">TA</option><option value="HEAD_TA">Head TA</option><option value="PROFESSOR">استاد</option></select>
    <button className="btn btn-primary">تخصیص نقش</button>{msg ? <p className="muted">{msg}</p> : null}
  </form>;
}
