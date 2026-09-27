import { Resend } from "resend";
import { env } from "@/lib/env";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function actionEmailHtml(heading: string, body: string, buttonLabel: string, url: string): string {
  return `<!doctype html><html><body style="margin:0;background:#07060f;font-family:Segoe UI,Arial,sans-serif;color:#f4ecff">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <p style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#18e0d0;margin:0 0 12px">GuessTheBollySong</p>
    <h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(heading)}</h1>
    <p style="line-height:1.6;color:#cfc3e6;margin:0 0 28px">${escapeHtml(body)}</p>
    <a href="${escapeHtml(url)}" style="display:inline-block;background:#ff2e88;color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:999px">${escapeHtml(buttonLabel)}</a>
    <p style="font-size:12px;color:#8d80a6;margin:28px 0 0">If you didn't ask for this, you can ignore this email.</p>
  </div></body></html>`;
}

export async function sendEmail(message: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required to send email in production");
    }
    // Development fallback: print the message so sign-in links can be
    // clicked straight from the server log.
    console.info(`\n[email:dev] to=${message.to} subject="${message.subject}"\n${message.text}\n`);
    return;
  }
  const { error } = await new Resend(RESEND_API_KEY).emails.send({
    from: EMAIL_FROM,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
