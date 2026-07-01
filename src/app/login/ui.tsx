"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
export function LoginForm(){const [msg,setMsg]=useState(''); async function submit(fd:FormData){setMsg('در حال ورود...'); const res=await signIn('credentials',{email:fd.get('email'),password:fd.get('password'),redirect:false,callbackUrl:'/dashboard'}); if(res?.ok) location.href='/dashboard'; else setMsg('ورود ناموفق بود. ایمیل، رمز یا وضعیت حساب را بررسی کنید.')} return <form className="form" action={submit}><input className="input" name="email" type="email" placeholder="ایمیل"/><input className="input" name="password" type="password" placeholder="رمز عبور"/><button className="btn btn-primary">ورود</button>{msg?<p className="muted">{msg}</p>:null}</form>}
