import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "TAFlow | سامانه مدیریت دستیار آموزشی", description: "سامانه یکپارچه مدیریت TA، Head TA، نمرات، پیام‌ها و ارزشیابی دانشگاه" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
