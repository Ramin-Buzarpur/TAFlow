import { auth } from "@/server/auth/auth";
import { getMyProfile } from "@/server/services/users";
import { Topbar, Card, EmptyState } from "@/components/ui";
import { ProfileForm, PasswordForm } from "./ui";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return <><Topbar/><main className="shell"><EmptyState title="ورود لازم است" text="برای مشاهده تنظیمات حساب وارد شوید."/></main></>;
  const profile = await getMyProfile(session.user.id);
  return <><Topbar/><main className="shell">
    <div className="page-title"><div><h1>تنظیمات حساب کاربری</h1><p className="muted">ویرایش پروفایل و تغییر رمز عبور.</p></div></div>
    <section className="grid grid-2">
      <Card><h2>اطلاعات حساب</h2><p className="muted">{profile.email}</p><ProfileForm name={profile.name || ""} timezone={profile.timezone}/></Card>
      <Card><h2>تغییر رمز عبور</h2><PasswordForm/></Card>
    </section>
  </main></>;
}
