"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Settings, UserRound } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "مدیر سیستم",
  EDUCATION_ADMIN: "مدیر آموزشی",
  PROFESSOR: "استاد",
  HEAD_TA: "Head TA",
  TA: "TA",
  STUDENT: "دانشجو",
};

export function UserMenu({ name, email, role }: { name: string | null; email: string; role?: string | null }) {
  const label = name || email;
  const initial = label.trim().charAt(0).toUpperCase();
  const roleLabel = role ? ROLE_LABELS[role] || role : "حساب کاربری";
  return (
    <details className="user-menu">
      <summary className="user-menu__trigger">
        <span className="avatar user-menu__avatar">{initial}</span>
        <span className="user-menu__copy">
          <strong>{label}</strong>
          <span>{roleLabel}</span>
        </span>
        <ChevronDown size={16} className="user-menu__chevron" />
      </summary>
      <div className="user-menu__panel">
        <div className="user-menu__profile">
          <span className="avatar user-menu__profile-avatar">{initial}</span>
          <div>
            <strong>{label}</strong>
            <span>{email}</span>
          </div>
        </div>
        <Link href="/dashboard" className="user-menu__item">
          <LayoutDashboard size={16} />
          <span>داشبورد</span>
        </Link>
        <Link href="/profile" className="user-menu__item">
          <UserRound size={16} />
          <span>پروفایل</span>
        </Link>
        <Link href="/settings" className="user-menu__item">
          <Settings size={16} />
          <span>تنظیمات</span>
        </Link>
        <button className="user-menu__item user-menu__item--danger" type="button" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut size={16} />
          <span>خروج</span>
        </button>
      </div>
    </details>
  );
}
