import { sendResendEmail } from "@/lib/email/resend";

type JoinRequestNotification = {
  dealershipName: string;
  dealershipId: string;
  requesterName: string;
  requesterEmail: string;
  requestMessage?: string | null;
  recipientEmails: string[];
};

export async function sendJoinRequestNotificationEmail(notification: JoinRequestNotification) {
  if (!notification.recipientEmails.length) {
    return { sent: false, skipped: true };
  }

  const subject = `Join request for ${notification.dealershipName}`;
  const bodyLines = [
    `${notification.requesterName} (${notification.requesterEmail}) requested access to ${notification.dealershipName}.`,
    notification.requestMessage ? `Message: ${notification.requestMessage}` : "",
    `Review the request in ListingFlow: /dashboard/team?dealershipId=${notification.dealershipId}`,
  ].filter(Boolean);

  return sendResendEmail({
    from: "ListingFlow <no-reply@listingflow.ai>",
    to: notification.recipientEmails,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px;">Join request for ${notification.dealershipName}</h2>
        <p style="margin:0 0 12px;">${notification.requesterName} (${notification.requesterEmail}) requested access to ${notification.dealershipName}.</p>
        ${notification.requestMessage ? `<p style="margin:0 0 12px;"><strong>Message:</strong> ${notification.requestMessage}</p>` : ""}
        <p style="margin:0;">Review it in ListingFlow at <strong>/dashboard/team</strong>.</p>
      </div>
    `,
    text: bodyLines.join("\n"),
  });
}
