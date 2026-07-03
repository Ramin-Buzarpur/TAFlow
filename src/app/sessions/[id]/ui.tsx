"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";

type QueueEntry = {
  id: string;
  studentId: string;
  status: "WAITING" | "CALLED" | "DONE" | "LEFT";
  joinedAt: string;
  student: { id: string; name: string | null; email: string };
};

const POLL_INTERVAL_MS = 5000;

export function QueuePanel({ sessionId, currentUserId, canManage }: { sessionId: string; currentUserId: string; canManage: boolean }) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const toast = useToast();

  useEffect(() => {
    let ignore = false;
    fetch(`/api/sessions/${sessionId}/queue`).then(async (res) => {
      if (!ignore && res.ok) setEntries(await res.json());
    });
    return () => { ignore = true; };
  }, [sessionId, refreshToken]);

  useEffect(() => {
    const interval = setInterval(() => setRefreshToken((t) => t + 1), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  async function act(action: () => Promise<Response>, errorMessage: string) {
    setLoading(true);
    const res = await action();
    setLoading(false);
    if (res.ok) setRefreshToken((t) => t + 1);
    else { const json = await res.json().catch(() => ({})); toast.show(json.message || errorMessage, "error"); }
  }

  const myEntry = entries.find((e) => e.studentId === currentUserId);
  const waitingCount = entries.filter((e) => e.status === "WAITING").length;
  const myPosition = myEntry?.status === "WAITING" ? entries.filter((e) => e.status === "WAITING" && e.joinedAt <= myEntry.joinedAt).length : null;

  return <div className="stack">
    {!canManage ? <div>
      {myEntry?.status === "CALLED"
        ? <p style={{ fontWeight: 700 }}>نوبت شماست! وارد جلسه شوید.</p>
        : myEntry?.status === "WAITING"
          ? <p className="muted">در صف هستید — جایگاه شما: {myPosition} از {waitingCount}</p>
          : <p className="muted">در صف نیستید.</p>}
      <div style={{ marginTop: 10 }}>
        {myEntry?.status === "WAITING" || myEntry?.status === "CALLED"
          ? <button className="btn" disabled={loading} onClick={() => act(() => fetch(`/api/sessions/${sessionId}/queue`, { method: "DELETE" }), "خطا در خروج از صف")}>خروج از صف</button>
          : <button className="btn btn-primary" disabled={loading} onClick={() => act(() => fetch(`/api/sessions/${sessionId}/queue`, { method: "POST" }), "خطا در پیوستن به صف")}>پیوستن به صف</button>}
      </div>
    </div> : null}

    {canManage ? <div>
      <button className="btn btn-primary" disabled={loading || waitingCount === 0} onClick={() => act(() => fetch(`/api/sessions/${sessionId}/queue/call-next`, { method: "POST" }), "صف خالی است")}>صدا زدن نفر بعد ({waitingCount} در انتظار)</button>
      <div className="stack" style={{ marginTop: 12 }}>
        {entries.length === 0 ? <p className="muted">کسی در صف نیست.</p> : entries.map((e) => <div className="list-row" key={e.id}>
          <div><strong>{e.student.name || e.student.email}</strong><p className="muted">{e.status === "CALLED" ? "صدا زده شد" : "در انتظار"}</p></div>
          <button className="btn" disabled={loading} onClick={() => act(() => fetch(`/api/sessions/${sessionId}/queue/entries/${e.id}/done`, { method: "POST" }), "خطا در ثبت پایان")}>پایان</button>
        </div>)}
      </div>
    </div> : null}
  </div>;
}
