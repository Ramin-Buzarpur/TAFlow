import Link from "next/link";
import { NAV_LINKS } from "./nav-links";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__about">
          <div className="site-footer__brand">
            <span className="brand-wordmark brand-wordmark--landing" aria-label="TAFlow" dir="ltr">
              <span className="brand-wordmark__text">TAFlow</span>
              <span className="brand-wordmark__shine" aria-hidden="true" />
            </span>
            <p>سامانه مدیریت دستیار آموزشی برای فرصت‌ها، درس‌ها، نمره‌ها و پیگیری‌های روزمره.</p>
          </div>
        </div>

        <div className="site-footer__columns">
          <div>
            <h3>دسترسی سریع</h3>
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
