import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Clock3, FileText } from "lucide-react";
import { auth } from "@/server/auth/auth";
import { listApplications } from "@/server/services/ta-workflow";
import { Badge, Card, EmptyState, Kpi, StatusBadge, Topbar } from "@/components/ui";

export default async function MyOpportunityApplicationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <EmptyState title="ورود لازم است" text="برای مشاهده درخواست‌های خود وارد شوید." />
        </main>
      </>
    );
  }

  const applications = await listApplications(session.user.id, { mine: true, take: 100 });
  const activeCount = applications.filter((application) => !["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(application.status)).length;
  const acceptedCount = applications.filter((application) => application.status === "ACCEPTED").length;

  return (
    <>
      <Topbar />
      <main className="shell">
        <div className="page-title">
          <div>
            <Badge tone="blue">فرصت‌های همکاری</Badge>
            <h1>درخواست‌های من</h1>
            <p className="muted">وضعیت درخواست‌های TA و Head TA که برای فرصت‌های همکاری ارسال کرده‌اید.</p>
          </div>
          <Link className="btn btn-primary" href="/opportunities">
            مشاهده فرصت‌ها
            <ArrowLeft size={16} />
          </Link>
        </div>

        <section className="grid grid-3">
          <Kpi icon={FileText} label="کل درخواست‌ها" value={applications.length} />
          <Kpi icon={Clock3} label="در حال بررسی" value={activeCount} tone="orange" />
          <Kpi icon={BriefcaseBusiness} label="پذیرفته‌شده" value={acceptedCount} tone="green" />
        </section>

        <Card style={{ marginTop: 20 }}>
          <h2>سوابق درخواست</h2>
          <div className="stack" style={{ marginTop: 14 }}>
            {applications.length ? applications.map((application) => (
              <Link className="list-row" href={`/applications/${application.id}`} key={application.id}>
                <div>
                  <strong>{application.opportunity.title}</strong>
                  <p className="muted">
                    {application.opportunity.courseOffering.course.title} · {application.opportunity.courseOffering.semester.title}
                  </p>
                  <p className="muted">
                    نقش درخواستی: {application.requestedRole} · ثبت: {new Date(application.submittedAt).toLocaleDateString("fa-IR")}
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </Link>
            )) : (
              <EmptyState title="درخواستی ثبت نشده" text="هنوز برای فرصت‌های همکاری درخواستی ارسال نکرده‌اید." />
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
