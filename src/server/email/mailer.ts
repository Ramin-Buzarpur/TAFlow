import "server-only";
import nodemailer from "nodemailer";

const globalForMailer = globalThis as unknown as { mailTransport?: nodemailer.Transporter };

function transport() {
  if (globalForMailer.mailTransport) return globalForMailer.mailTransport;
  if (process.env.TAFLOW_E2E === "1") {
    const t = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: "unix"
    });
    globalForMailer.mailTransport = t;
    return t;
  }
  const user = process.env.SMTP_USER || undefined;
  const pass = process.env.SMTP_PASSWORD || undefined;
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
    auth: user && pass ? { user, pass } : undefined
  });
  globalForMailer.mailTransport = t;
  return t;
}

export async function sendMail(input: { to: string; subject: string; html: string; text?: string }) {
  return transport().sendMail({
    from: process.env.EMAIL_FROM || "noreply@example.edu",
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });
}
