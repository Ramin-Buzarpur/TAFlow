"use client";
import { useState } from "react";
export function CertificateRequestForm(){const [msg,setMsg]=useState(''); async function submit(fd:FormData){const res=await fetch('/api/certificates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseOfferingId:fd.get('courseOfferingId'),role:fd.get('role')})}); const j=await res.json(); setMsg(res.ok?'درخواست ثبت شد.':j.message)} return <form className="form" action={submit}><input className="input" name="courseOfferingId" placeholder="CourseOffering ID"/><select className="select" name="role"><option value="TA">TA</option><option value="HEAD_TA">Head TA</option></select><button className="btn btn-primary">درخواست گواهی</button>{msg?<p className="muted">{msg}</p>:null}</form>}

export function DownloadCertificateButton({ fileId }: { fileId: string }) {
  const [msg, setMsg] = useState("");
  async function download() {
    const res = await fetch(`/api/files/${fileId}`);
    const json = await res.json();
    if (res.ok) window.open(json.url, "_blank"); else setMsg(json.message);
  }
  return <><button className="btn" onClick={download}>دانلود PDF</button>{msg ? <span className="muted">{msg}</span> : null}</>;
}
