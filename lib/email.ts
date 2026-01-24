export async function sendEmail(opts: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  console.log(
    "[email]",
    JSON.stringify({ to: opts.to, subject: opts.subject, body: opts.body })
  );
}
