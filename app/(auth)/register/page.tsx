import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-md items-center px-5 py-12">
      <Card>
        <h1 className="text-3xl font-black text-white">Create account</h1>
        <form className="mt-6 space-y-4">
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-mana" placeholder="Display name" />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-mana" placeholder="Email" type="email" />
          <input className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-mana" placeholder="Password" type="password" />
          <button className="w-full rounded-md bg-aureate px-4 py-3 font-semibold text-void" type="button">
            Create account
          </button>
        </form>
        <p className="mt-5 text-sm text-zinc-400">
          Already registered? <Link className="text-mana" href="/login">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
