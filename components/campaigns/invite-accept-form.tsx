"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InviteAcceptForm() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function acceptInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(body?.error || "Could not accept invite.");
      return;
    }
    setToken("");
    setMessage("Invite accepted.");
    router.refresh();
  }

  return (
    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={acceptInvite}>
      <input className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana" placeholder="Invite token" value={token} onChange={(event) => setToken(event.target.value)} />
      <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" type="submit">
        Accept
      </button>
      {message ? <p className="sm:basis-full text-sm text-mana">{message}</p> : null}
    </form>
  );
}
