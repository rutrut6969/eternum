"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Could not create that account.");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (signInResult?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <input
        className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana"
        placeholder="Display name"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <input
        className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana"
        placeholder="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <input
        className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana"
        placeholder="Password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error ? <p className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{error}</p> : null}
      <button className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60" disabled={loading} type="submit">
        {loading ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}
