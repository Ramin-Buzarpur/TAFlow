import type { Metadata } from "next";
import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "@fontsource/vazirmatn/900.css";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = { title: "TAFlow | سامانه مدیریت دستیار آموزشی", description: "سامانه یکپارچه مدیریت TA، Head TA، نمرات، پیام‌ها و ارزشیابی دانشگاه" };

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fa" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}/></head><body><ToastProvider>{children}</ToastProvider></body></html>;
}
