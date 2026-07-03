"use client";
import { useState } from "react";

export type KanbanTask = { id: string; title: string; description: string | null; status: string; assignee: { id: string; name: string | null; email: string } | null; dueAt: string | null; submission?: { submittedAt: string; file: { id: string; originalName: string } } | null };

async function downloadSubmission(fileId: string) {
  const res = await fetch(`/api/files/${fileId}`);
  const json = await res.json();
  if (res.ok) window.open(json.url, "_blank");
}

const COLUMNS: { key: string; label: string }[] = [
  { key: "TODO", label: "تعریف‌شده" },
  { key: "IN_PROGRESS", label: "در حال انجام" },
  { key: "REVIEW", label: "نیازمند بازبینی" },
  { key: "DONE", label: "انجام‌شده" },
  { key: "CANCELLED", label: "لغوشده" }
];

export function Kanban({ tasks }: { tasks: KanbanTask[] }) {
  const [items, setItems] = useState(tasks);
  const [dragId, setDragId] = useState<string | null>(null);

  async function move(taskId: string, status: string) {
    setItems((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  }

  return <div className="kanban-grid">
    {COLUMNS.map((col) => <div
      key={col.key}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => { if (dragId) move(dragId, col.key); }}
      style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: 12, minHeight: 220 }}
    >
      <h3 style={{ fontSize: 14, marginTop: 0 }}>{col.label} ({items.filter((t) => t.status === col.key).length})</h3>
      <div className="stack">
        {items.filter((t) => t.status === col.key).map((t) => <div
          key={t.id}
          draggable
          onDragStart={() => setDragId(t.id)}
          className="list-row"
          style={{ cursor: "grab", flexDirection: "column", alignItems: "flex-start", gap: 6 }}
        >
          <strong>{t.title}</strong>
          {t.assignee ? <span className="muted">{t.assignee.name || t.assignee.email}</span> : <span className="muted">بدون مسئول</span>}
          {t.dueAt ? <span className="muted">موعد: {new Date(t.dueAt).toLocaleDateString("fa-IR")}</span> : null}
          {t.submission ? <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn" style={{ fontSize: 12, padding: "6px 10px" }} onClick={(e) => { e.stopPropagation(); downloadSubmission(t.submission!.file.id); }}>دانلود تحویل: {t.submission.file.originalName}</button>
            {t.dueAt && new Date(t.submission.submittedAt) > new Date(t.dueAt) ? <span style={{ fontSize: 11, fontWeight: 800, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "2px 8px" }}>دیرکرد</span> : null}
          </div> : null}
        </div>)}
      </div>
    </div>)}
  </div>;
}
