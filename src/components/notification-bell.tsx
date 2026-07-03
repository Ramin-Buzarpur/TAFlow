"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/notifications").then((r) => r.json()).then((data) => { if (alive) { setItems(Array.isArray(data) ? data : []); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  return <div className="notif-bell" ref={ref}>
    <button type="button" className="btn notif-bell-toggle" aria-label="اعلان‌ها" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
      <Bell size={18}/>
      {unread > 0 ? <span className="notif-dot">{unread > 9 ? "9+" : unread}</span> : null}
    </button>
    {open ? <div className="notif-panel">
      <div className="notif-panel-head"><strong>اعلان‌ها</strong></div>
      <div className="stack" style={{ gap: 8 }}>
        {loaded && items.length === 0 ? <p className="muted" style={{ padding: "10px 4px", margin: 0 }}>اعلانی وجود ندارد.</p> : null}
        {items.map((n) => {
          const content = <div className="notif-row" data-unread={!n.readAt}>
            <div>
              <strong>{n.title}</strong>
              {n.body ? <p className="muted">{n.body}</p> : null}
              <p className="muted notif-time">{new Date(n.createdAt).toLocaleString("fa-IR")}</p>
            </div>
            {!n.readAt ? <button type="button" className="btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id); }}>خوانده شد</button> : null}
          </div>;
          return n.href
            ? <Link key={n.id} href={n.href} className="notif-link" onClick={() => { if (!n.readAt) markRead(n.id); setOpen(false); }}>{content}</Link>
            : <div key={n.id}>{content}</div>;
        })}
      </div>
    </div> : null}
  </div>;
}
