function wrap(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="font-family: Tahoma, Arial, sans-serif; background:#F7F7F8; padding:24px; direction:rtl; text-align:right;">
  <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #D9E2EC; border-radius:12px; padding:24px;">
    <h2 style="color:#1E3A5F; margin-top:0;">${title}</h2>
    ${bodyHtml}
    <p style="color:#6B7280; font-size:12px; margin-top:32px;">این ایمیل به‌صورت خودکار از سامانه مدیریت دستیار آموزشی ارسال شده است.</p>
  </div>
</body>
</html>`;
}

export function passwordResetEmail(resetUrl: string) {
  return {
    subject: "بازیابی رمز عبور",
    html: wrap(
      "بازیابی رمز عبور",
      `<p>برای تنظیم رمز عبور جدید روی لینک زیر کلیک کنید. این لینک تا ۳۰ دقیقه معتبر است.</p>
       <p><a href="${resetUrl}" style="color:#2563EB;">بازیابی رمز عبور</a></p>
       <p>اگر این درخواست را شما ارسال نکرده‌اید، این ایمیل را نادیده بگیرید.</p>`
    ),
    text: `برای بازیابی رمز عبور به این لینک مراجعه کنید: ${resetUrl}`
  };
}

export function verifyEmailEmail(verifyUrl: string) {
  return {
    subject: "تایید ایمیل دانشگاهی",
    html: wrap(
      "تایید ایمیل",
      `<p>برای فعال‌سازی حساب کاربری خود روی لینک زیر کلیک کنید.</p>
       <p><a href="${verifyUrl}" style="color:#2563EB;">تایید ایمیل</a></p>`
    ),
    text: `برای تایید ایمیل به این لینک مراجعه کنید: ${verifyUrl}`
  };
}
