import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-md items-center px-5 py-12">
      <Card>
        <h1 className="text-3xl font-black text-white">Create account</h1>
        <RegisterForm />
        <p className="mt-5 text-sm text-zinc-400">
          Already registered? <Link className="text-mana" href="/login">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
