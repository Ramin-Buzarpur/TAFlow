import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listThreads } from "@/server/services/messaging";
import { Topbar, Card, EmptyState, StatusBadge } from "@/components/ui";
import { NewMessageForm } from "./ui";
export default async function MessagesPage() {
  const session = await auth(); if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای پیام‌ها وارد شوید."/></main></>;
  const threads = await listThreads(session.user.id, {});
  return <><Topbar/><main className="shell"><div className="page-title"><div><h1>پیام‌رسانی داخلی</h1><p className="muted">گفت‌وگوی درس‌محور و قابل ردیابی بین دانشجو، TA، Head TA و استاد.</p></div></div><section className="grid grid-2"><Card><h2>پیام‌های من</h2><div className="stack">{threads.map((t) => <Link className="list-row" href={`/messages/${t.id}`} key={t.id}><div><strong>{t.subject}</strong><p className="muted">{t.courseOffering?.course.title || t.type}</p></div><StatusBadge status={t.isClosed ? "CLOSED" : "OPEN"}/></Link>)}</div></Card><Card><h2>پیام جدید</h2><NewMessageForm/></Card></section></main></>;
}
