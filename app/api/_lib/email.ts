import nodemailer from "nodemailer";

type ReplyNotification = {
  to: string;
  studentName: string;
  workId: string;
  workTitle: string;
  question: string;
  reply: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

export function replyEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && (process.env.SMTP_FROM_EMAIL || process.env.SMTP_ADMIN_EMAIL || process.env.SMTP_USER));
}

export async function sendReplyNotification(input: ReplyNotification) {
  if (!replyEmailConfigured()) return { sent: false as const, reason: "not_configured" as const };
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE.toLowerCase() === "true"
    : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_ADMIN_EMAIL || user || "";
  const fromName = process.env.SMTP_FROM_NAME || process.env.SMTP_SENDER_NAME || "수빙니기는 문학시간";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://literature.lhsstart.synology.me").replace(/\/$/, "");
  const workUrl = `${siteUrl}/works/${encodeURIComponent(input.workId)}`;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    ...(user && pass ? { auth: { user, pass } } : {}),
  });

  await transporter.sendMail({
    from: { name: fromName, address: fromEmail },
    to: input.to,
    subject: `[수빙니기는 문학시간] ${input.workTitle} 질문에 답변이 등록되었습니다`,
    text: `${input.studentName}님, 「${input.workTitle}」에 남긴 질문에 교사 답변이 등록되었습니다.\n\n질문\n${input.question}\n\n교사 답변\n${input.reply}\n\n답변 확인: ${workUrl}`,
    html: `<p>${escapeHtml(input.studentName)}님, <strong>「${escapeHtml(input.workTitle)}」</strong>에 남긴 질문에 교사 답변이 등록되었습니다.</p><h3>질문</h3><p style="white-space:pre-wrap">${escapeHtml(input.question)}</p><h3>교사 답변</h3><p style="white-space:pre-wrap">${escapeHtml(input.reply)}</p><p><a href="${escapeHtml(workUrl)}">사이트에서 답변 확인하기</a></p>`,
  });
  return { sent: true as const };
}
