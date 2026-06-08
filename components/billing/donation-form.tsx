"use client";

import { useState } from "react";

const options = [500, 1000, 2500, 5000];

export function DonationForm() {
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const amountCents = custom ? Math.max(0, Math.round(Number(custom) * 100)) : amount;

  async function donate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/billing/donate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents })
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error || "Donation checkout is unavailable.");
      return;
    }
    window.location.href = body.checkoutUrl;
  }

  return (
    <form className="grid gap-4" onSubmit={donate}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map((option) => (
          <button
            key={option}
            className={`rounded-md border px-4 py-3 text-sm font-semibold ${!custom && amount === option ? "border-aureate bg-aureate text-void" : "border-white/10 bg-black/25 text-zinc-100 hover:bg-white/5"}`}
            type="button"
            onClick={() => {
              setAmount(option);
              setCustom("");
            }}
          >
            ${(option / 100).toFixed(0)}
          </button>
        ))}
      </div>
      <label className="grid gap-2 text-sm font-semibold text-zinc-200">
        Custom amount
        <input className="rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white" inputMode="decimal" min="1" placeholder="Custom amount in USD" type="number" value={custom} onChange={(event) => setCustom(event.target.value)} />
      </label>
      {message ? <p className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{message}</p> : null}
      <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void disabled:opacity-60" disabled={loading || amountCents < 100} type="submit">
        {loading ? "Opening Square..." : "Donate with Square"}
      </button>
      <p className="text-xs leading-5 text-zinc-500">Donations support development and do not grant premium access. Founder lifetime access is purchased separately on Pricing.</p>
    </form>
  );
}
