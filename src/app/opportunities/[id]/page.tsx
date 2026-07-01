import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { getTAOpportunity } from "@/server/services/ta-workflow";
import { Topbar, Card, EmptyState, StatusBadge } from "@/components/ui";
import { ApplyOpportunityForm } from "./ui";
export default async function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth(); if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای ارسال درخواست وارد شوید."/></main></>;
  const { id } = await params; const o = await getTAOpportunity(session.user.id, id);
  return <><Topbar/><main className="shell"><div className="page-title"><div><h1>{o.title}</h1><p className="muted">{o.courseOffering.course.title} — مهلت: {new Date(o.deadline).toLocaleDateString("fa-IR")}</p></div><StatusBadge status={o.status}/></div><section className="grid grid-2"><Card><h2>جزئیات فرصت</h2><p>{o.description}</p><h3>شرایط</h3><p className="muted">{o.requirements}</p></Card><Card><h2>ارسال درخواست</h2><ApplyOpportunityForm opportunityId={o.id}/></Card></section></main></>;
}
