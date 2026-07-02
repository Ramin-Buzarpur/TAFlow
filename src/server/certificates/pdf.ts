import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import reshaperPkg from "arabic-persian-reshaper";

const { PersianShaper } = reshaperPkg;

function reshapeRtl(text: string) {
  return PersianShaper.convertArabic(text).split("").reverse().join("");
}

const FONT_PATH = path.join(process.cwd(), "node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff");

export async function renderCertificatePdf(input: {
  name: string;
  role: string;
  course: string;
  semester: string;
  trackingCode: string;
  issuedAt: Date;
  verificationUrl?: string;
}) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = await fs.readFile(FONT_PATH);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });

  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();
  const primary = rgb(0.118, 0.227, 0.373);
  const accent = rgb(0.145, 0.388, 0.922);

  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: accent, borderWidth: 2 });
  page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: primary, borderWidth: 0.75 });

  function drawRtl(text: string, y: number, size = 18, color = primary) {
    const shaped = reshapeRtl(text);
    const w = font.widthOfTextAtSize(shaped, size);
    page.drawText(shaped, { x: (width - w) / 2, y, size, font, color });
  }

  drawRtl("گواهی فعالیت آموزشی", height - 120, 30, accent);
  drawRtl("این گواهی تایید می‌کند که", height - 190, 16);
  drawRtl(input.name, height - 235, 24, accent);
  drawRtl(`در درس ${input.course} در نقش ${input.role} طی ${input.semester} فعالیت داشته است.`, height - 280, 14);
  drawRtl(`کد رهگیری: ${input.trackingCode}`, height - 340, 12);
  drawRtl(`تاریخ صدور: ${input.issuedAt.toLocaleDateString("fa-IR")}`, height - 365, 12);

  if (input.verificationUrl) {
    const qrDataUrl = await QRCode.toDataURL(input.verificationUrl, { margin: 0, width: 160 });
    const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const qrSize = 90;
    page.drawImage(qrImage, { x: width - 60 - qrSize, y: 45, width: qrSize, height: qrSize });
  }

  return Buffer.from(await pdfDoc.save());
}
