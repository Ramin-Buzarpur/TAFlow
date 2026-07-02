"use client";
import { useEffect, useRef, useState } from "react";

const jalaliDateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "full", timeStyle: "short" });
const jalaliDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "full", timeZone: "UTC" });

export function JalaliHint({ inputName }: { inputName: string }) {
  const [text, setText] = useState("");
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const input = anchorRef.current?.closest("form")?.querySelector<HTMLInputElement>(`input[name="${inputName}"]`);
    if (!input) return;
    const formatter = input.type === "date" ? jalaliDateFormatter : jalaliDateTimeFormatter;
    function update() {
      if (!input!.value) { setText(""); return; }
      const date = new Date(input!.value);
      setText(Number.isNaN(date.getTime()) ? "" : formatter.format(date));
    }
    input.addEventListener("input", update);
    update();
    return () => input.removeEventListener("input", update);
  }, [inputName]);

  return <span ref={anchorRef} className="muted" style={{ fontSize: 12 }}>{text ? `تاریخ شمسی: ${text}` : null}</span>;
}
