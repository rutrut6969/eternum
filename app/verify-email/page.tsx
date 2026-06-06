import Link from "next/link";
import { Card } from "@/components/ui/card";
import { isVerificationTokenExpired } from "@/lib/auth/email-verification";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  let title = "Verification link invalid";
  let copy = "This verification link is missing or could not be found.";

  if (token) {
    const user = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
    if (user && !isVerificationTokenExpired(user.emailVerificationExpires)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      });
      title = "Email verified";
      copy = "Your account is now ready for campaign creation and public publishing.";
    } else if (user) {
      title = "Verification link expired";
      copy = "Request a fresh verification email from your account dashboard.";
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-120px)] max-w-xl items-center px-5 py-12">
      <Card>
        <h1 className="text-3xl font-black text-white">{title}</h1>
        <p className="mt-4 text-zinc-300">{copy}</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-md bg-aureate px-4 py-3 font-semibold text-void">
          Go to dashboard
        </Link>
      </Card>
    </main>
  );
}
