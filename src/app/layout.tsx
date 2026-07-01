import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "TAFlow | سامانه مدیریت دستیار آموزشی", description: "سامانه یکپارچه مدیریت TA، Head TA، نمرات، پیام‌ها و ارزشیابی دانشگاه" };

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fa" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}/></head><body>{children}</body></html>;
}
