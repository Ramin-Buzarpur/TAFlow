import { Inbox, type LucideIcon } from "lucide-react";

export function EmptyState({ title, text, icon: Icon = Inbox }: { title: string; text: string; icon?: LucideIcon }) {
  return <div className="card empty-state"><Icon size={34} className="empty-state-icon"/><h3>{title}</h3><p className="muted">{text}</p></div>;
}
