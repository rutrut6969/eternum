"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function EmailStatusCard({ email, verified }: { email: string; verified: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/auth/send-verification", { method: "POST" });
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    setLoading(false);
    if (!response.ok) {
      setMessage(body?.error || "Could not send verification email.");
      return;
    }
    setMessage(body?.message || "Verification email sent.");
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Account email</h2>
          <p className="mt-2 break-all text-sm text-zinc-300">{email}</p>
        </div>
        <Badge tone={verified ? "stamina" : "crimson"}>{verified ? "Verified" : "Unverified"}</Badge>
      </div>
      {!verified ? (
        <div className="mt-4">
          <p className="text-sm leading-6 text-zinc-300">Verify your email to create campaigns and publish public homebrew.</p>
          <button className="mt-3 w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60 sm:w-auto" onClick={resend} disabled={loading} type="button">
            {loading ? "Sending..." : "Resend verification email"}
          </button>
        </div>
      ) : null}
      {message ? <p className="mt-3 rounded-md border border-mana/25 bg-mana/10 p-3 text-sm text-mana">{message}</p> : null}
    </Card>
  );
}
