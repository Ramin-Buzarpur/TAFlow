import { auth } from "@/server/auth/auth";
import { listMyCourseOfferings } from "@/server/services/rbac";
import { Topbar, Card } from "@/components/ui";
import { SurveyBuilder, SurveyResultsViewer } from "./ui";
export default async function SurveysPage(){
  const session = await auth();
  const offerings = session?.user?.id ? await listMyCourseOfferings(session.user.id) : [];
  return <><Topbar/><main className="shell"><div className="page-title"><div><h1>ارزیابی‌های TA و رأی‌گیری زمان جلسه</h1><p className="muted">سازنده فرم چندسوالی برای ارزیابی‌های course-scoped، پاسخ ناشناس، حداقل تعداد پاسخ برای نمایش نتایج و رأی‌گیری زمان جلسه.</p></div></div><section className="grid grid-2"><Card><h2>ساخت ارزیابی</h2><SurveyBuilder offerings={offerings.map((o) => ({ id: o.id, title: `${o.course.title} — ${o.semester.title}` }))}/></Card><Card><h2>مشاهده نتایج</h2><SurveyResultsViewer/></Card></section></main></>;
}
