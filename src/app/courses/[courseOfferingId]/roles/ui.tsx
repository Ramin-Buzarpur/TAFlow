"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/primitives";
import { useToast } from "@/components/toast";
import { Plus, Save, ShieldOff } from "lucide-react";

type UserRef = { id: string; name: string | null; email: string };
type RoleAssignmentView = {
  id: string;
  role: string;
  note: string | null;
  assignmentSource: string;
  activeFrom: string;
  activeUntil: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  user: UserRef;
  assignedBy: UserRef | null;
  revokedBy: UserRef | null;
};

const ROLE_OPTIONS = [
  { value: "STUDENT", label: "دانشجو" },
  { value: "TA", label: "TA" },
  { value: "HEAD_TA", label: "Head TA" }
] as const;

function roleTone(role: string): "blue" | "green" | "purple" | "orange" | "red" | "gray" {
  switch (role) {
    case "HEAD_TA":
      return "purple";
    case "TA":
      return "blue";
    case "STUDENT":
      return "green";
    case "PROFESSOR":
      return "orange";
    case "EDUCATION_ADMIN":
      return "red";
    default:
      return "gray";
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fa-IR");
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function CourseRoleManagementPanel({
  courseOfferingId,
  assignments,
  canManage
}: {
  courseOfferingId: string;
  assignments: RoleAssignmentView[];
  canManage: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const activeAssignments = useMemo(() => assignments.filter((assignment) => !assignment.revokedAt), [assignments]);
  const revokedAssignments = useMemo(() => assignments.filter((assignment) => assignment.revokedAt), [assignments]);

  async function createRole(fd: FormData) {
    const res = await fetch(`/api/course-offerings/${courseOfferingId}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: fd.get("userId"),
        role: fd.get("role"),
        note: String(fd.get("note") || "").trim() || undefined,
        assignmentSource: "course-role-panel"
      })
    });
    const json = await readJson(res);
    if (res.ok) {
      toast.show("نقش ثبت شد.", "success");
      router.refresh();
      return;
    }
    toast.show(json.message || "خطا در ثبت نقش", "error");
  }

  async function updateRole(assignmentId: string, fd: FormData) {
    const noteValue = String(fd.get("note") || "").trim();
    const res = await fetch(`/api/course-offerings/${courseOfferingId}/roles/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteValue || null })
    });
    const json = await readJson(res);
    if (res.ok) {
      toast.show("یادداشت نقش به‌روز شد.", "success");
      router.refresh();
      return;
    }
    toast.show(json.message || "خطا در به‌روزرسانی نقش", "error");
  }

  async function revokeRole(assignmentId: string, fd: FormData) {
    const reason = String(fd.get("reason") || "").trim();
    const res = await fetch(`/api/course-offerings/${courseOfferingId}/roles/${assignmentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || undefined })
    });
    const json = await readJson(res);
    if (res.ok) {
      toast.show("نقش لغو شد.", "success");
      router.refresh();
      return;
    }
    toast.show(json.message || "خطا در لغو نقش", "error");
  }

  return <div className="stack">
    <Card>
      <h2>ثبت نقش جدید</h2>
      {canManage ? (
        <form className="form" action={createRole}>
          <input className="input" name="userId" placeholder="شناسه کاربر" required />
          <select className="select" name="role" defaultValue="TA">
            {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <textarea className="textarea" name="note" placeholder="یادداشت اختیاری" />
          <button className="btn btn-primary" type="submit"><Plus size={16} /> ثبت نقش</button>
        </form>
      ) : (
        <p className="muted">برای ثبت یا لغو نقش باید مجوز مدیریت نقش‌های درس را داشته باشید.</p>
      )}
    </Card>

    <section className="grid grid-2">
      <Card>
        <h2>نقش‌های فعال</h2>
        <div className="stack" data-testid="active-role-assignments" style={{ marginTop: 14 }}>
          {activeAssignments.length ? activeAssignments.map((assignment) => (
            <div className="list-row" key={assignment.id} data-assignment-id={assignment.id}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong>{assignment.user.name || assignment.user.email}</strong>
                  <Badge tone={roleTone(assignment.role)}>{assignment.role}</Badge>
                </div>
                <p className="muted">
                  {assignment.user.email} · ثبت‌شده توسط {assignment.assignedBy?.name || assignment.assignedBy?.email || "سیستم"} · {formatDate(assignment.createdAt)}
                </p>
                <p className="muted">اعتبار از {formatDate(assignment.activeFrom)} تا {formatDate(assignment.activeUntil)}</p>
                {assignment.note ? <p className="muted">یادداشت: {assignment.note}</p> : null}
              </div>
              {canManage ? (
                <div style={{ minWidth: 280, display: "grid", gap: 10 }}>
                  <form className="form" action={(fd) => updateRole(assignment.id, fd)}>
                    <textarea className="textarea" name="note" defaultValue={assignment.note || ""} placeholder="یادداشت نقش" />
                    <button className="btn" type="submit"><Save size={16} /> ذخیره</button>
                  </form>
                  <form className="form" action={(fd) => revokeRole(assignment.id, fd)}>
                    <textarea className="textarea" name="reason" placeholder="دلیل لغو اختیاری" />
                    <button className="btn" type="submit"><ShieldOff size={16} /> لغو نقش</button>
                  </form>
                </div>
              ) : null}
            </div>
          )) : <p className="muted">هنوز نقش فعالی برای این درس ثبت نشده است.</p>}
        </div>
      </Card>

      <Card>
        <h2>تاریخچه نقش‌ها</h2>
        <div className="stack" data-testid="revoked-role-assignments" style={{ marginTop: 14 }}>
          {revokedAssignments.length ? revokedAssignments.map((assignment) => (
            <div className="list-row" key={assignment.id} data-assignment-id={assignment.id}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong>{assignment.user.name || assignment.user.email}</strong>
                  <Badge tone="gray">{assignment.role}</Badge>
                  <Badge tone="red">لغو شده</Badge>
                </div>
                <p className="muted">
                  {assignment.user.email} · ثبت‌شده توسط {assignment.assignedBy?.name || assignment.assignedBy?.email || "سیستم"} · {formatDate(assignment.createdAt)}
                </p>
                <p className="muted">
                  لغو توسط {assignment.revokedBy?.name || assignment.revokedBy?.email || "نامشخص"} · {formatDate(assignment.revokedAt)}
                </p>
                {assignment.revokeReason ? <p className="muted">دلیل لغو: {assignment.revokeReason}</p> : null}
              </div>
            </div>
          )) : <p className="muted">هیچ سابقه لغو شده‌ای ثبت نشده است.</p>}
        </div>
      </Card>
    </section>
  </div>;
}
