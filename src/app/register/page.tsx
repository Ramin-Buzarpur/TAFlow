import { Topbar, Card } from "@/components/ui";
import { RegisterForm } from "./ui";
export default function RegisterPage(){return <><Topbar/><main className="shell"><Card style={{ marginTop: 40 }}><h1>ثبت‌نام دانشجو</h1><p className="muted">بعد از ثبت‌نام، تایید ایمیل و فعال‌سازی حساب بر اساس سیاست دانشگاه انجام می‌شود.</p><RegisterForm/></Card></main></>}
