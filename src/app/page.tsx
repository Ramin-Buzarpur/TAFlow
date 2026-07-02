import Link from "next/link";
import { MotionConfig } from "motion/react";
import { Topbar, Card, Badge, Kpi } from "@/components/ui";
import { CommandPalette } from "@/components/command-palette";
import { TextFlip } from "@/components/marketing/text-flip";
import { AnimatedCounter } from "@/components/marketing/animated-counter";
import { Reveal } from "@/components/marketing/reveal";
import { AosProvider } from "@/components/marketing/aos-provider";
import { Mascot } from "@/components/marketing/mascot";

export default function HomePage() {
  const features = [
    ["درخواست TA و Head TA", "دانشجویان رزومه و انگیزه‌نامه ثبت می‌کنند و وضعیت درخواست را لحظه‌ای می‌بینند."],
    ["بررسی رزومه متقاضیان", "استاد و Head TA متقاضیان را فیلتر، مقایسه، shortlist و قبول/رد می‌کنند."],
    ["کلاس‌های رفع اشکال", "لینک Meet یا محل حضوری جلسه ثبت می‌شود و دانشجو با یک کلیک وارد می‌شود."],
    ["دفتر نمرات و خروجی", "ورود نمره، انتشار کنترل‌شده، خروجی CSV و گزارش تغییرات با لاگ امنیتی."],
    ["پیام‌رسانی داخلی", "گفت‌وگوی درس‌محور بین دانشجو، TA، Head TA، استاد و آموزش."],
    ["ارزشیابی و گواهی", "نظرسنجی ناشناس، رأی‌گیری زمان کلاس، و صدور خودکار گواهی TA."]
  ];

  const timeline = [
    ["ایجاد فرصت", "استاد برای درس خود فرصت TA/Head TA منتشر می‌کند."],
    ["ثبت درخواست", "دانشجو با رزومه و انگیزه‌نامه درخواست می‌دهد."],
    ["بررسی و امتیازدهی", "استاد/Head TA متقاضیان را مقایسه و امتیازدهی می‌کنند."],
    ["پذیرش و نقش درس‌محور", "پس از پذیرش، نقش TA/Head TA به‌صورت خودکار فعال می‌شود."],
    ["فعالیت و ارزیابی", "جلسات، نمرات، پیام‌ها و نظرسنجی در طول ترم ثبت می‌شوند."],
    ["صدور گواهی", "در پایان ترم گواهی فعالیت با QR قابل راستی‌آزمایی صادر می‌شود."]
  ];

  return <MotionConfig reducedMotion="user">
    <AosProvider/>
    <Topbar/><CommandPalette/>
    <main className="shell">
      <section className="hero">
        <div className="hero-blobs"><span/><span/><span/></div>
        <div>
          <Badge tone="blue">نسخه یکپارچه full-stack</Badge>
          <h1>سامانه هوشمند مدیریت <TextFlip words={["دستیاران آموزشی", "TAFlow", "Head TA", "Gradebook", "گواهی TA"]}/></h1>
          <p>از درخواست TA تا مدیریت کلاس، نمره‌دهی، ارزیابی، گواهی و ارتباطات آموزشی؛ همه در یک جریان یکپارچه، فارسی و راست‌به‌چپ.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <Link className="btn btn-primary" href="/dashboard">ورود به داشبورد</Link>
            <Link className="btn" href="/opportunities">مشاهده فرصت‌ها</Link>
          </div>
        </div>
        <div className="hero-card">
          <div className="mock-window">
            <div className="kpi"><div><p className="muted">درخواست‌های فعال</p><strong><AnimatedCounter to={128}/></strong></div><Badge tone="green">+۱۸٪</Badge></div>
          </div>
          <div className="grid grid-2">
            <Card><h3>جلسه امروز</h3><p className="muted">رفع اشکال مدار ۱ — ساعت ۱۵:۳۰</p><button className="btn btn-primary">ورود به جلسه</button></Card>
            <Card><h3>وضعیت انتخاب</h3><p><Badge tone="purple">مصاحبه</Badge> <Badge tone="green">منتخب</Badge></p></Card>
          </div>
        </div>
        <Mascot pose="point" className="hero-mascot"/>
      </section>

      <section className="grid grid-3" style={{ marginTop: 24 }}>
        {features.map(([title, text], i) => <Reveal key={title} delay={i * 0.05}>
          <Card className="feature-card"><span className="iconbox"/><h3>{title}</h3><p className="muted">{text}</p></Card>
        </Reveal>)}
      </section>

      <section className="grid grid-4" style={{ marginTop: 24 }}>
        <Kpi label="دروس فعال" value={<AnimatedCounter to={56}/>}/>
        <Kpi label="دانشجویان ثبت‌نام‌شده" value={<AnimatedCounter to={2483}/>} tone="green"/>
        <Kpi label="میانگین رضایت" value="۴.۶/۵" tone="orange"/>
        <Kpi label="گواهی‌های صادرشده" value={<AnimatedCounter to={321}/>} tone="purple"/>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>گردش‌کار انتخاب تا صدور گواهی</h2>
        <div className="grid grid-3" style={{ marginTop: 16 }}>
          {timeline.map(([title, text], i) => <div key={title} data-aos="fade-up" data-aos-delay={i * 60}>
            <Card><Badge tone="blue">{i + 1}</Badge><h3>{title}</h3><p className="muted">{text}</p></Card>
          </div>)}
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 40, marginBottom: 40 }} data-aos="fade-up">
        <Card>
          <h2>امنیت و حریم خصوصی</h2>
          <div className="stack">
            <div className="list-row">RBAC درس‌محور، نه فقط سطح کاربر</div>
            <div className="list-row">2FA (TOTP) برای نقش‌های حساس</div>
            <div className="list-row">rate limiting مبتنی بر Redis</div>
            <div className="list-row">AuditLog کامل برای عملیات حساس</div>
          </div>
        </Card>
        <Card style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <Mascot pose="celebrate" size={90}/>
          <div style={{ flex: 1, minWidth: 220 }}>
          <h2>آماده شروع هستید؟</h2>
          <p className="muted">همین حالا با یکی از حساب‌های نمونه وارد شوید یا فرصت‌های TA فعال را ببینید.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <Link className="btn btn-primary" href="/login">ورود</Link>
            <Link className="btn" href="/opportunities">فرصت‌های TA</Link>
          </div>
          </div>
        </Card>
      </section>
    </main>
  </MotionConfig>;
}
