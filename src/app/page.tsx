import Link from "next/link";
import { MotionConfig } from "motion/react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  FileText,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { AnimatedCounter } from "@/components/marketing/animated-counter";
import { Mascot } from "@/components/marketing/mascot";
import { Reveal } from "@/components/marketing/reveal";
import { BrandAnimator } from "@/components/brand-animator";
import { Badge, Card, Kpi } from "@/components/ui";
import { NAV_LINKS } from "@/components/nav-links";
import { NAV_ICONS } from "@/components/nav-icons";

const landingNavLinks = NAV_LINKS.filter((link) => link.href === "/opportunities" || link.href === "/courses");

const roleCards = [
  {
    title: "دانشجو",
    description: "فرصت‌ها را می‌بیند، درخواست می‌دهد و وضعیت خودش را شفاف دنبال می‌کند.",
    href: "/opportunities",
    icon: GraduationCap,
  },
  {
    title: "TA / Head TA",
    description: "جلسه‌ها، نمره‌ها و کارهای روزمره را در یک فضای متمرکز مدیریت می‌کند.",
    href: "/dashboard",
    icon: BriefcaseBusiness,
  },
  {
    title: "استاد",
    description: "درخواست‌ها را بررسی می‌کند، نقش‌ها را تخصیص می‌دهد و روند درس را کنترل می‌کند.",
    href: "/evaluations/professor",
    icon: BookOpen,
  },
  {
    title: "آموزش",
    description: "پیکربندی، پایش و گزارش‌گیری سامانه را برای چند درس و چند ترم انجام می‌دهد.",
    href: "/admin",
    icon: ShieldCheck,
  },
];

const moduleCards = [
  {
    title: "فرصت‌های TA",
    description: "انتشار، فیلتر، مقایسه و پیگیری درخواست‌ها با جریان کاری روشن.",
    href: "/opportunities",
    icon: BriefcaseBusiness,
    chips: ["انتشار", "فیلتر", "درخواست"],
  },
  {
    title: "جلسات و نوبت‌ها",
    description: "برنامه‌ریزی، صف مراجعات، ثبت حضور و هماهنگی‌های روزانه.",
    href: "/sessions",
    icon: CalendarClock,
    chips: ["تقویم", "حضور", "یادآور"],
  },
  {
    title: "نمره‌ها و ارزیابی",
    description: "ورود نمره، کنترل انتشار، پیگیری بازخورد و خروجی‌گیری امن.",
    href: "/grades",
    icon: FileText,
    chips: ["ورود", "بازبینی", "CSV / PDF"],
  },
];

const flowSteps = [
  {
    title: "ثبت و ورود",
    description: "کاربر با مسیر ساده وارد می‌شود و نقش او از همان ابتدا مشخص است.",
  },
  {
    title: "دسترسی شفاف",
    description: "مجوزها، بخش‌ها و مسیرهای حساس بر اساس نقش فعال می‌شوند.",
  },
  {
    title: "کار روزمره",
    description: "جلسه، فرصت، نمره و بازبینی در یک محیط منظم جلو می‌روند.",
  },
  {
    title: "خروجی قابل اعتماد",
    description: "گزارش، PDF، CSV و ثبت رخدادها برای مرور و پیگیری بعدی آماده است.",
  },
];

const trustStats = [
  { label: "فرصت‌های فعال", value: <AnimatedCounter to={18} />, icon: BriefcaseBusiness },
  { label: "جلسات نزدیک", value: <AnimatedCounter to={24} />, icon: CalendarClock },
  { label: "نمره‌های ثبت‌شده", value: <AnimatedCounter to={9} />, icon: FileText },
  { label: "رضایت کاربران", value: "4.8/5", icon: BarChart3 },
];

const securityPoints = [
  "RBAC در سطح درس",
  "2FA برای نقش‌های حساس",
  "Audit Log و Rate Limit",
  "PDF / CSV امن",
];

function LandingTopbar() {
  return (
    <header className="landing-topbar">
      <div className="shell landing-topbar__inner">
        <Link className="landing-topbar__brand" href="/">
          <span className="brand-wordmark brand-wordmark--landing brand-wordmark--animated" aria-label="TAFlow" dir="ltr">
            <BrandAnimator className="brand-animator--landing" />
            <span className="brand-wordmark__shine" aria-hidden="true" />
          </span>
        </Link>

        <nav className="landing-topbar__nav" aria-label="ناوبری اصلی">
          {landingNavLinks.map(({ href, label, icon }) => {
            const Icon = NAV_ICONS[icon];
            return (
              <Link key={href} href={href} className="landing-topbar__nav-link">
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="landing-topbar__actions">
          <Link className="landing-topbar__btn" href="/register">
            ثبت‌نام
          </Link>
          <Link className="landing-topbar__btn landing-topbar__btn--primary" href="/login">
            ورود
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-shell landing-shell--sky">
        <LandingTopbar />

        <main className="landing-page">
          <section className="landing-band landing-band--hero">
            <div className="landing-band__pattern landing-band__pattern--hero" aria-hidden="true" />
            <div className="shell landing-band__inner landing-hero-grid">
              <div className="landing-hero-copy">
                <Badge tone="blue">نسخه دانشگاهی TAFlow</Badge>
                <div className="landing-hero-heading">
                  <h1>ورود ساده به مدیریت TA، بدون شلوغی و بدون سردرگمی</h1>
                  <p>
                    TAFlow برای تیم‌های آموزشی و دانشگاه‌ها ساخته شده تا فرصت‌های TA، جلسه‌ها، اعلان‌ها و
                    نمره‌ها را در یک مسیر شفاف، مدرن و قابل اتکا جمع کند.
                  </p>
                </div>

                <div className="landing-hero-actions">
                  <Link className="btn btn-primary" href="/register">
                    شروع کنید
                    <ArrowLeft size={16} />
                  </Link>
                  <Link className="btn" href="/opportunities">
                    مشاهده فرصت‌ها
                  </Link>
                  <Link className="btn" href="/dashboard">
                    ورود به داشبورد
                  </Link>
                </div>

                <div className="landing-hero-pills">
                  <span className="landing-pill">RBAC درسی</span>
                  <span className="landing-pill">2FA</span>
                  <span className="landing-pill">Audit Log</span>
                  <span className="landing-pill">PDF / CSV</span>
                </div>
              </div>

              <Reveal className="landing-hero-visual">
                <div className="landing-hero-stage">
                  <div className="landing-hero-stage__halo landing-hero-stage__halo--one" aria-hidden="true" />
                  <div className="landing-hero-stage__halo landing-hero-stage__halo--two" aria-hidden="true" />
                  <div className="landing-hero-stage__shell">
                    <div className="landing-hero-stage__top">
                      <span className="landing-tag landing-tag--soft">۱۲ مورد جدید</span>
                      <span className="landing-tag">امروز</span>
                    </div>

                    <div className="landing-hero-stage__layout">
                      <div className="landing-hero-stage__board">
                        <div className="landing-hero-stage__board-head">
                          <div>
                            <p className="landing-kicker">نمای کلّی</p>
                            <strong>یک درس فعال، یک نگاه سریع</strong>
                          </div>
                          <Badge tone="purple">Live</Badge>
                        </div>

                        <div className="landing-hero-stage__board-grid">
                          <div>
                            <span>فرصت‌های باز</span>
                            <strong>
                              <AnimatedCounter to={12} />
                            </strong>
                          </div>
                          <div>
                            <span>درخواست در صف</span>
                            <strong>
                              <AnimatedCounter to={34} />
                            </strong>
                          </div>
                          <div>
                            <span>جلسه‌های امروز</span>
                            <strong>
                              <AnimatedCounter to={5} />
                            </strong>
                          </div>
                        </div>

                        <div className="landing-hero-stage__illus">
                          <Mascot pose="point" size={180} className="landing-hero-mascot" />
                        </div>
                      </div>

                      <div className="landing-hero-stage__stack">
                        <div className="landing-hero-stage__card">
                          <Badge tone="blue">فعال</Badge>
                          <strong>مهندسی نرم‌افزار ۲</strong>
                          <p>۳ درخواست تازه · ۱ Head TA مورد نیاز</p>
                        </div>
                        <div className="landing-hero-stage__card landing-hero-stage__card--accent">
                          <Badge tone="orange">در صف</Badge>
                          <strong>سیستم‌عامل</strong>
                          <p>بررسی رزومه · زمان‌بندی مصاحبه</p>
                        </div>
                        <div className="landing-hero-stage__card">
                          <Badge tone="purple">فعال</Badge>
                          <strong>پایگاه داده</strong>
                          <p>جلسه امروز · ۱۸ ثبت‌نام</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          <section className="landing-band landing-band--roles">
            <div className="landing-band__pattern landing-band__pattern--roles" aria-hidden="true" />
            <div className="shell landing-band__inner">
              <div className="landing-section-head landing-section-head--split">
                <div>
                  <Badge tone="blue">نقش‌ها</Badge>
                  <h2>هر نقش، مسیر خودش را دارد</h2>
                </div>
                <p>
                  صفحهٔ اصلی باید در چند ثانیه نشان بدهد که هر کاربر از کجا وارد می‌شود و بعد از ورود چه چیزی
                  پیش روی اوست.
                </p>
              </div>

              <div className="landing-role-grid">
                {roleCards.map(({ title, description, href, icon: Icon }) => (
                  <Reveal key={title}>
                    <Card className="landing-role-card">
                      <div className="landing-role-card__head">
                        <div className="landing-role-card__icon">
                          <Icon size={22} />
                        </div>
                        <Link href={href} className="landing-role-card__arrow" aria-label={`ورود به ${title}`}>
                          <ArrowLeft size={16} />
                        </Link>
                      </div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section className="landing-band landing-band--flow">
            <div className="landing-band__pattern landing-band__pattern--flow" aria-hidden="true" />
            <div className="shell landing-band__inner">
              <div className="landing-section-head">
                <div>
                  <Badge tone="purple">جریان کار</Badge>
                  <h2>صفحه‌ای که کاربر را بدون بار شناختی زیاد جلو می‌برد</h2>
                </div>
                <p>
                  ما مسیرها را به چند گام کوتاه و روشن تقسیم می‌کنیم تا کاربر بداند از ورود تا خروجی دقیقاً چه
                  چیزی در انتظار اوست.
                </p>
              </div>

              <div className="landing-flow-grid">
                {flowSteps.map((step, index) => (
                  <Reveal key={step.title} delay={index * 0.05}>
                    <Card className="landing-flow-card">
                      <div className="landing-flow-card__step">{index + 1}</div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section className="landing-band landing-band--modules">
            <div className="landing-band__pattern landing-band__pattern--modules" aria-hidden="true" />
            <div className="shell landing-band__inner">
              <div className="landing-section-head landing-section-head--split">
                <div>
                  <Badge tone="blue">ماژول‌های اصلی</Badge>
                  <h2>دسترسی سریع به بخش‌های مهم، بدون شلوغیِ اضافه</h2>
                </div>
                <p>
                  سه ماژول پرکاربرد را جلو آورده‌ایم تا کاربر تازه‌وارد هم سریع بفهمد کدام مسیر برای او مهم‌تر
                  است.
                </p>
              </div>

              <div className="landing-module-grid">
                {moduleCards.map(({ title, description, href, icon: Icon, chips }) => (
                  <Reveal key={title}>
                    <Card className="landing-module-card">
                      <div className="landing-module-card__icon">
                        <Icon size={24} />
                      </div>
                      <div className="landing-module-card__body">
                        <h3>{title}</h3>
                        <p>{description}</p>
                        <div className="landing-chip-list">
                          {chips.map((chip) => (
                            <span className="landing-chip" key={chip}>
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Link href={href} className="landing-module-card__link" aria-label={`رفتن به ${title}`}>
                        <ArrowLeft size={16} />
                      </Link>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section className="landing-band landing-band--trust">
            <div className="landing-band__pattern landing-band__pattern--trust" aria-hidden="true" />
            <div className="shell landing-band__inner">
              <div className="landing-trust-grid">
                {trustStats.map(({ label, value, icon: Icon }) => (
                  <Kpi key={label} label={label} value={value} icon={Icon} />
                ))}
              </div>

              <div className="landing-security-strip">
                {securityPoints.map((item) => (
                  <div key={item}>
                    <ShieldCheck size={18} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="landing-band landing-band--cta">
            <div className="shell landing-band__inner landing-cta-panel">
              <div className="landing-cta-copy">
                <Badge tone="blue">آماده شروع</Badge>
                <h2>جریان اصلی دانشگاه و TA را از همین امروز ساده‌تر کنید</h2>
                <p>
                  با یک صفحهٔ اول خلوت‌تر، دسترسی روشن‌تر و هویت بصری آبی و مدرن، کاربر خیلی سریع‌تر وارد
                  بخش موردنظرش می‌شود.
                </p>
                <div className="landing-hero-actions">
                  <Link className="btn btn-primary" href="/register">
                    ثبت‌نام
                    <ArrowLeft size={16} />
                  </Link>
                  <Link className="btn" href="/login">
                    ورود
                  </Link>
                  <Link className="btn" href="/dashboard">
                    داشبورد
                  </Link>
                </div>
              </div>

              <div className="landing-cta-visual">
                <Mascot pose="celebrate" size={152} className="landing-cta-mascot" />
              </div>
            </div>
          </section>

        </main>
      </div>
    </MotionConfig>
  );
}
