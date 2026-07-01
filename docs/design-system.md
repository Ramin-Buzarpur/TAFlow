# Design System Notes

این پروژه از یک Design System سبک SaaS آموزشی استفاده می‌کند:

- سبک: Soft UI Evolution + Bento Dashboard
- رنگ اصلی: #2563EB
- رنگ مکمل: #0EA5E9
- رنگ موفقیت: #16A34A
- رنگ هشدار: #F59E0B
- رنگ خطر: #DC2626
- پس‌زمینه: #F6F9FC
- کارت: #FFFFFF

قواعد مهم:

- همه صفحات RTL و فارسی هستند.
- تمام دکمه‌های قابل کلیک focus-visible دارند.
- رنگ‌ها باید حداقل کنتراست WCAG AA را حفظ کنند.
- جدول‌های بزرگ باید pagination و export داشته باشند.
- لیست‌ها باید empty/loading/error state داشته باشند.
- motion باید کوتاه باشد و prefers-reduced-motion رعایت شود.
- برای dashboardها از کارت، badge، status chip و grid استفاده شود.

الگوها:

- Homepage: Hero + feature cards + KPI strip
- Dashboard: role-aware cards + recent actions
- Recruitment UI: applicant cards + status pipeline
- Gradebook: table/spreadsheet style
- Messages: inbox + thread panel
- Calendar: cards + ICS export
