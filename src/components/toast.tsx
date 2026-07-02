"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Tone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: Tone };
type ToastContextValue = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, tone: Tone = "info") => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return <ToastContext.Provider value={{ show }}>
    {children}
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((t) => <div key={t.id} className={`toast toast-${t.tone}`}>{t.message}</div>)}
    </div>
  </ToastContext.Provider>;
}
