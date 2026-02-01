import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const MAIL_FROM = process.env.MAIL_FROM;

if (!MAIL_FROM) {
  throw new Error("MAIL_FROM is not defined");
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
  return resend.emails.send({
    from: MAIL_FROM,
    to,
    subject,
    html,
  });
}
