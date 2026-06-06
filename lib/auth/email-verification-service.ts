import { validateEmailFormat } from "@/lib/auth/validation";

export type EmailVerificationResult = {
  valid: boolean;
  message?: string;
};

type Provider = "none" | "zerobounce" | "abstract";

function getProvider(): Provider {
  const provider = process.env.EMAIL_VERIFICATION_PROVIDER || "none";
  if (provider === "zerobounce" || provider === "abstract") return provider;
  return "none";
}

function rejectRiskyEmail(message = "Use a valid, non-disposable email address.") {
  return { valid: false, message };
}

export const emailVerificationService = {
  async verify(email: string): Promise<EmailVerificationResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!validateEmailFormat(normalizedEmail)) {
      return { valid: false, message: "Enter a valid email address." };
    }

    const provider = getProvider();
    if (provider === "none") return { valid: true };

    const apiKey = process.env.EMAIL_VERIFICATION_API_KEY;
    if (!apiKey) {
      return { valid: false, message: "Email verification is not configured." };
    }

    if (provider === "abstract") {
      const response = await fetch(
        `https://emailvalidation.abstractapi.com/v1/?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(normalizedEmail)}`,
        { cache: "no-store" }
      );
      if (!response.ok) return rejectRiskyEmail("Email verification failed. Try another email.");
      const data = (await response.json()) as {
        deliverability?: string;
        is_disposable_email?: { value?: boolean };
        quality_score?: number;
      };
      if (data.deliverability !== "DELIVERABLE" || data.is_disposable_email?.value || (data.quality_score ?? 1) < 0.7) {
        return rejectRiskyEmail();
      }
      return { valid: true };
    }

    const response = await fetch(
      `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(normalizedEmail)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return rejectRiskyEmail("Email verification failed. Try another email.");
    const data = (await response.json()) as { status?: string; sub_status?: string };
    if (data.status !== "valid") return rejectRiskyEmail();
    return { valid: true };
  }
};
