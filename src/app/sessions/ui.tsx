"use client";
import { useRouter } from "next/navigation";
import { JalaliHint } from "@/components/jalali-hint";
import { useToast } from "@/components/toast";

export function NewSessionForm({ offerings, currentUserId }: { offerings: { id: string; title: string }[]; currentUserId: string }) {
  const router = useRouter();
  const toast = useToast();
  async function submit(fd: FormData) {
    const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseOfferingId: fd.get("courseOfferingId"), hostId: fd.get("hostId"), title: fd.get("title"), description: fd.get("description") || undefined, startsAt: fd.get("startsAt"), endsAt: fd.get("endsAt"), meetingUrl: fd.get("meetingUrl") || undefined, location: fd.get("location") || undefined, capacity: Number(fd.get("capacity") || 0) || undefined }) });
    const j = await res.json();
    if (res.ok) { toast.show("جلسه ساخته شد.", "success"); router.refresh(); }
    else toast.show(j.message || "خطا در ثبت جلسه", "error");
  }
  return <form className="form" action={submit}>
    <select className="select" name="courseOfferingId" required>{offerings.length ? offerings.map((o) => <option key={o.id} value={o.id}>{o.title}</option>) : <option value="">درسی در دسترس نیست</option>}</select>
    <input type="hidden" name="hostId" value={currentUserId}/>
    <input className="input" name="title" placeholder="عنوان جلسه" required/>
    <textarea className="textarea" name="description" placeholder="توضیح"/>
    <div><input className="input" name="startsAt" type="datetime-local" required/><JalaliHint inputName="startsAt"/></div>
    <div><input className="input" name="endsAt" type="datetime-local" required/><JalaliHint inputName="endsAt"/></div>
    <input className="input" name="meetingUrl" placeholder="https://meet.google.com/..."/>
    <input className="input" name="location" placeholder="مکان حضوری"/>
    <input className="input" name="capacity" placeholder="ظرفیت"/>
    <button className="btn btn-primary">ثبت جلسه</button>
  </form>;
}

export function RegisterButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const toast = useToast();
  async function register() {
    const res = await fetch(`/api/sessions/${sessionId}/register`, { method: "POST" });
    const j = await res.json();
    if (res.ok) { toast.show("ثبت‌نام شد.", "success"); router.refresh(); }
    else toast.show(j.message || "خطا در ثبت‌نام", "error");
  }
  return <button className="btn" onClick={register}>ثبت‌نام</button>;
}
