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
  const mailFrom = process.env.MAIL_FROM ?? process.env.RESEND_FROM_EMAIL;
  if (!mailFrom) {
    throw new Error("MAIL_FROM (or RESEND_FROM_EMAIL) is not defined");
  }
  return mailFrom;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      (process.env.MAIL_FROM?.trim() || process.env.RESEND_FROM_EMAIL?.trim())
  );
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

export async function sendEmailWithAttachment(input: {
  to: string;
  subject: string;
  html: string;
  attachments: Array<{ filename: string; content: Buffer }>;
}) {
  const resend = getResend();
  const from = getMailFrom();
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
  if (error) {
    console.error("[email] Resend attachment error:", error);
    throw new Error(error.message ?? "Failed to send email");
  }
  return data;
}
