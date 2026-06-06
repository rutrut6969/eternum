"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InviteLandingActions({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setLoading(false);
    if (!response.ok) {
      setMessage(body?.error || "Could not accept invite.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60 sm:w-auto" onClick={accept} disabled={loading} type="button">
        {loading ? "Accepting..." : "Accept invite"}
      </button>
      {message ? <p className="mt-3 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{message}</p> : null}
    </div>
  );
}
