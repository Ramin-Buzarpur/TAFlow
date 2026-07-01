import Link from "next/link";
import { Topbar, Card, Badge, Kpi } from "@/components/ui";
import { CommandPalette } from "@/components/command-palette";

export default function HomePage() {
  const features = [
    ["درخواست TA و Head TA", "دانشجویان رزومه و انگیزه‌نامه ثبت می‌کنند و وضعیت درخواست را لحظه‌ای می‌بینند."],
    ["بررسی رزومه متقاضیان", "استاد و Head TA متقاضیان را فیلتر، مقایسه، shortlist و قبول/رد می‌کنند."],
    ["کلاس‌های رفع اشکال", "لینک Meet یا محل حضوری جلسه ثبت می‌شود و دانشجو با یک کلیک وارد می‌شود."],
    ["دفتر نمرات و خروجی", "ورود نمره، انتشار کنترل‌شده، خروجی CSV و گزارش تغییرات با لاگ امنیتی."],
    ["پیام‌رسانی داخلی", "گفت‌وگوی درس‌محور بین دانشجو، TA، Head TA، استاد و آموزش."],
    ["ارزشیابی و گواهی", "نظرسنجی ناشناس، رأی‌گیری زمان کلاس، و صدور خودکار گواهی TA."],
  ];
  return <><Topbar/><CommandPalette/><main className="shell"><section className="hero"><div><Badge tone="blue">نسخه یکپارچه full-stack</Badge><h1>مدیریت هوشمند دستیاران آموزشی از انتخاب تا گواهی پایان ترم</h1><p>TAFlow یک سامانه فارسی RTL برای دانشگاه‌هاست: انتخاب TA و Head TA، نقش‌های درس‌محور، پیام‌ها، جلسات رفع اشکال، دفتر نمرات، نظرسنجی، تقویم آموزشی، گواهی و داشبوردهای نقش‌محور.</p><div style={{ display:"flex", gap:12, marginTop:24 }}><Link className="btn btn-primary" href="/dashboard">ورود به داشبورد</Link><Link className="btn" href="/opportunities">مشاهده فرصت‌ها</Link></div></div><div className="hero-card"><div className="mock-window"><div className="kpi"><div><p className="muted">درخواست‌های فعال</p><strong>۱۲۸</strong></div><Badge tone="green">+۱۸٪</Badge></div></div><div className="grid grid-2"><Card><h3>جلسه امروز</h3><p className="muted">رفع اشکال مدار ۱ — ساعت ۱۵:۳۰</p><button className="btn btn-primary">ورود به جلسه</button></Card><Card><h3>وضعیت انتخاب</h3><p><Badge tone="purple">مصاحبه</Badge> <Badge tone="green">منتخب</Badge></p></Card></div></div></section><section className="grid grid-3" style={{ marginTop:24 }}>{features.map(([title,text]) => <Card key={title}><span className="iconbox"/><h3>{title}</h3><p className="muted">{text}</p></Card>)}</section><section className="grid grid-4" style={{ marginTop:24 }}><Kpi label="دروس فعال" value="۵۶"/><Kpi label="دانشجویان ثبت‌نام‌شده" value="۲٬۴۸۳" tone="green"/><Kpi label="میانگین رضایت" value="۴.۶/۵" tone="orange"/><Kpi label="گواهی‌های صادرشده" value="۳۲۱" tone="purple"/></section></main></>;
}
