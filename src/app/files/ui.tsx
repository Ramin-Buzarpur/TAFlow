"use client";
import { useState } from "react";
import { FileUpload } from "@/components/file-upload";

export function FileUploadForm() {
  return <FileUpload onUploaded={() => window.location.reload()}/>;
}

export function FileRow({ id, name, sizeBytes }: { id: string; name: string; sizeBytes: number }) {
  const [msg, setMsg] = useState("");
  async function download() {
    const res = await fetch(`/api/files/${id}`);
    const json = await res.json();
    if (res.ok) window.open(json.url, "_blank"); else setMsg(json.message);
  }
  async function remove() {
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (res.ok) window.location.reload(); else setMsg((await res.json()).message);
  }
  return <div className="list-row">
    <div><strong>{name}</strong><p className="muted">{(sizeBytes / 1024).toFixed(0)} KB</p></div>
    <div style={{ display: "flex", gap: 8 }}>
      <button className="btn" onClick={download}>دانلود</button>
      <button className="btn" onClick={remove}>حذف</button>
    </div>
    {msg ? <p className="muted">{msg}</p> : null}
  </div>;
}
