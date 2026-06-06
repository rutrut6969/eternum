"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      {error ? <p className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{error}</p> : null}
      <button className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60" disabled={loading} type="submit">
        {loading ? "Signing in..." : "Continue"}
      </button>
    </form>
  );
}
