"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getPasswordRules, usernameFromDisplayName, validateEmailFormat, validateUsername } from "@/lib/auth/validation";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRules = useMemo(() => getPasswordRules(password), [password]);
  const passwordValid = passwordRules.every((rule) => rule.valid);
  const emailValid = email.length === 0 || validateEmailFormat(email);
  const localUsernameValidation = username ? validateUsername(username) : { valid: false, message: "" };

  useEffect(() => {
    if (usernameManuallyEdited) return;
    setUsername(usernameFromDisplayName(name));
  }, [name, usernameManuallyEdited]);

  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle");
      setUsernameMessage(null);
      return;
    }

    const localValidation = validateUsername(username);
    if (!localValidation.valid) {
      setUsernameStatus("invalid");
      setUsernameMessage(localValidation.message);
      return;
    }

    setUsernameStatus("checking");
    setUsernameMessage("Checking username...");
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`, {
          signal: controller.signal
        });
        const body = (await response.json()) as { available: boolean; message?: string };
        setUsernameStatus(body.available ? "available" : "taken");
        setUsernameMessage(body.available ? "Username available" : body.message || "Username already taken");
      } catch {
        if (!controller.signal.aborted) {
          setUsernameStatus("invalid");
          setUsernameMessage("Could not check username.");
        }
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [username]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!localUsernameValidation.valid || usernameStatus !== "available") {
      setError("Choose an available username before creating your account.");
      return;
    }
    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }
    if (!passwordValid) {
      setError("Complete every password requirement.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password })
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

    router.push(searchParams.get("callbackUrl") || "/dashboard");
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
      <div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana"
            placeholder="Username"
            autoComplete="username"
            value={username}
            onChange={(event) => {
              setUsernameManuallyEdited(true);
              setUsername(event.target.value);
            }}
            required
          />
          <button
            className="rounded-md border border-aureate/40 px-4 py-3 text-sm font-semibold text-aureate transition hover:bg-aureate/10"
            type="button"
            onClick={() => {
              setUsername(usernameFromDisplayName(name));
              setUsernameManuallyEdited(false);
            }}
          >
            Reset from display name
          </button>
        </div>
        {usernameMessage ? (
          <p
            className={[
              "mt-2 rounded-md border p-3 text-sm",
              usernameStatus === "available"
                ? "border-stamina/30 bg-stamina/10 text-stamina"
                : usernameStatus === "checking"
                  ? "border-mana/30 bg-mana/10 text-mana"
                  : "border-crimson/30 bg-crimson/10 text-crimson"
            ].join(" ")}
          >
            {usernameMessage}
          </p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">3-24 characters. Letters, numbers, and underscores only.</p>
        )}
      </div>
      <input
        className={[
          "w-full rounded-md border bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana",
          emailValid ? "border-white/10" : "border-crimson/40"
        ].join(" ")}
        placeholder="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      {!emailValid ? <p className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">Enter a valid email address.</p> : null}
      <input
        className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-mana"
        placeholder="Password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <div className="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-sm sm:grid-cols-2">
        {passwordRules.map((rule) => (
          <p key={rule.id} className={rule.valid ? "text-stamina" : "text-zinc-400"}>
            {rule.valid ? "OK" : "Need"} {rule.label}
          </p>
        ))}
      </div>
      {error ? <p className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{error}</p> : null}
      <button
        className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60"
        disabled={loading || usernameStatus !== "available" || !emailValid || !passwordValid}
        type="submit"
      >
        {loading ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}
