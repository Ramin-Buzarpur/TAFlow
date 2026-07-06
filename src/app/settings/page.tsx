import { auth } from "@/server/auth/auth";
import { getMyProfile } from "@/server/services/users";
import { Topbar, Card, EmptyState } from "@/components/ui";
import { PasswordForm, ProfileForm, TwoFactorPanel } from "./ui";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <>
        <Topbar />
        <main className="shell">
          <EmptyState title="ورود لازم است" text="برای مشاهده تنظیمات حساب وارد شوید." />
        </main>
      </>
    );
  }

  const profile = await getMyProfile(session.user.id);

  return (
    <>
      <Topbar />
      <main className="shell">
        <div className="page-title">
          <div>
            <h1>تنظیمات حساب کاربری</h1>
            <p className="muted">ویرایش پروفایل، تغییر رمز عبور و مدیریت 2FA.</p>
          </div>
        </div>
        <section className="grid grid-2">
          <Card>
            <h2>اطلاعات حساب</h2>
            <p className="muted">{profile.email}</p>
            <ProfileForm name={profile.name || ""} timezone={profile.timezone} />
          </Card>
          <Card>
            <h2>تغییر رمز عبور</h2>
            <PasswordForm />
          </Card>
        </section>
        <section style={{ marginTop: 24 }}>
          <Card>
            <h2>2FA</h2>
            <p className="muted">
              وضعیت: {profile.twoFactorEnabled ? "فعال" : "غیرفعال"} ·
              {profile.twoFactorRequired ? " این حساب در سیاست فعلی نیازمند 2FA است." : " برای این حساب فعال‌سازی اختیاری است."}
            </p>
            <TwoFactorPanel
              profile={{
                email: profile.email,
                globalRole: profile.globalRole,
                status: profile.status,
                twoFactorEnabled: profile.twoFactorEnabled,
                twoFactorRequired: profile.twoFactorRequired
              }}
            />
          </Card>
        </section>
      </main>
    </>
  );
}
