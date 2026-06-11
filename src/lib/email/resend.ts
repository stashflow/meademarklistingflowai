type EmailMessage = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

export async function sendResendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || message.from;

  if (!apiKey || !from) {
    return { sent: false, skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(details || `Resend returned ${response.status}`);
  }

  return { sent: true, skipped: false };
}
