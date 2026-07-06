"use client";
import { useEffect, useState } from "react";

type Result = { type: string; title: string; subtitle?: string; href: string };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Result[]>([]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { const t = setTimeout(async () => { if (q.trim().length < 2) return setItems([]); const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`); const json = await res.json(); setItems(json.data || []); }, 250); return () => clearTimeout(t); }, [q]);
  if (!open) return null;
  return <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.22)", zIndex:50, display:"grid", placeItems:"start center", paddingTop:110 }} onClick={() => setOpen(false)}><div className="card" style={{ width:"min(720px, calc(100% - 32px))" }} onClick={(e) => e.stopPropagation()}><input className="input" autoFocus placeholder="جستجوی درس، جلسه، اطلاعیه..." value={q} onChange={(e) => setQ(e.target.value)} /> <div className="stack" style={{ marginTop:14 }}>{items.map((item) => <a className="list-row" key={item.href} href={item.href}><div><strong>{item.title}</strong><p className="muted">{item.type} — {item.subtitle}</p></div></a>)}{q.length > 1 && items.length === 0 ? <p className="muted">نتیجه‌ای پیدا نشد.</p> : null}</div></div></div>;
}
