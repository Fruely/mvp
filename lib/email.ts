import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not defined");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

function getMailFrom(): string {
  const mailFrom = process.env.MAIL_FROM;
  if (!mailFrom) {
    throw new Error("MAIL_FROM is not defined");
  }
  return mailFrom;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  const from = getMailFrom();
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] Resend error:", error);
    throw new Error(error.message ?? "Failed to send email");
  }
  return data;
}
