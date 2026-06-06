import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth/options";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/dashboard");

  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-md items-center px-5 py-12">
      <Card>
        <h1 className="text-3xl font-black text-white">Create account</h1>
        <Suspense fallback={<p className="mt-6 text-sm text-zinc-300">Loading registration...</p>}>
          <RegisterForm />
        </Suspense>
        <p className="mt-5 text-sm text-zinc-400">
          Already registered? <Link className="text-mana" href="/login">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
