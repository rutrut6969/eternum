import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-md items-center px-5 py-12">
      <Card>
        <h1 className="text-3xl font-black text-white">Sign in</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-zinc-300">Loading sign in...</p>}>
          <LoginForm />
        </Suspense>
        <p className="mt-5 text-sm text-zinc-400">
          New to Eternum? <Link className="text-mana" href="/register">Create an account</Link>
        </p>
      </Card>
    </main>
  );
}
