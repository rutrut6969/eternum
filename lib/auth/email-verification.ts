import { randomBytes } from "crypto";
import { Resend } from "resend";

const verificationHours = 24;

export function createEmailVerificationToken() {
  return {
    token: randomBytes(32).toString("hex"),
    expires: new Date(Date.now() + verificationHours * 60 * 60 * 1000)
  };
}

export function isVerificationTokenExpired(expires: Date | null | undefined, now = new Date()) {
  return !expires || expires.getTime() < now.getTime();
}

export function getVerificationUrl(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(input: { email: string; name?: string | null; token: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "noreply@eternumtabletop.com";

  if (!apiKey) {
    return { sent: false, message: "RESEND_API_KEY is not configured." };
  }

  const resend = new Resend(apiKey);
  const url = getVerificationUrl(input.token);
  const displayName = input.name || "traveler";

  const result = await resend.emails.send({
    from,
    to: input.email,
    subject: "Verify your Eternum Tabletop account",
    html: `
      <div style="background:#08070b;color:#f7efe0;font-family:Arial,sans-serif;padding:32px">
        <div style="max-width:600px;margin:0 auto;border:1px solid rgba(241,201,107,.25);border-radius:8px;padding:24px;background:#111017">
          <p style="color:#f1c96b;text-transform:uppercase;letter-spacing:.18em;font-size:12px">Eternum Tabletop</p>
          <h1 style="color:#fff;margin:8px 0 16px">Verify your email</h1>
          <p>Hello ${displayName},</p>
          <p>Confirm this email address to unlock campaign creation, public publishing, and future account-gated integrations.</p>
          <p><a href="${url}" style="display:inline-block;background:#f1c96b;color:#08070b;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Verify email</a></p>
          <p style="color:#b9b2c6;font-size:13px">This link expires in 24 hours.</p>
        </div>
      </div>
    `,
    text: `Verify your Eternum Tabletop email: ${url}\n\nThis link expires in 24 hours.`
  });

  if (result.error) {
    return { sent: false, message: result.error.message };
  }

  return { sent: true };
}
