"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";

export function UserMenu({ name, email }: { name: string | null; email: string }) {
  const label = name || email;
  const initial = label.trim().charAt(0).toUpperCase();
  return <div className="user-menu">
    <Link href="/settings" className="user-menu-chip" title={email}>
      <span className="avatar" style={{ display: "grid", placeItems: "center", fontWeight: 800, color: "var(--primary)" }}>{initial}</span>
      <span className="user-menu-name">{label}</span>
    </Link>
    <button className="btn" onClick={() => signOut({ callbackUrl: "/" })}>خروج</button>
  </div>;
}
