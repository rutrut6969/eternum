"use client";

import { useState } from "react";

export function CheckoutButton({ planCode, disabled, label }: { planCode: "DM" | "WORLDBUILDER"; disabled?: boolean; label: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode })
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error || "Checkout is unavailable.");
      return;
    }
    window.location.href = body.checkoutUrl;
  }

  return (
    <div className="mt-5">
      <button className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-50" disabled={disabled || loading} onClick={checkout} type="button">
        {loading ? "Opening checkout..." : label}
      </button>
      {message ? <p className="mt-2 text-sm text-crimson">{message}</p> : null}
    </div>
  );
}
