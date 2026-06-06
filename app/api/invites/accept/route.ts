import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const acceptSchema = z.object({
  token: z.string().min(20)
});

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = acceptSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid invite token." }, { status: 400 });

  const invite = await prisma.campaignInvite.findUnique({ where: { token: parsed.data.token } });
  if (!invite || invite.status !== "PENDING") return NextResponse.json({ error: "Invite is not available." }, { status: 404 });
  if (invite.expiresAt < new Date()) {
    await prisma.campaignInvite.update({ where: { id: invite.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Invite expired." }, { status: 410 });
  }

  const membership = await prisma.campaignMember.upsert({
    where: { campaignId_userId: { campaignId: invite.campaignId, userId } },
    update: { roles: { set: invite.roles } },
    create: { campaignId: invite.campaignId, userId, roles: invite.roles }
  });

  await prisma.campaignInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED" } });

  return NextResponse.json({ membership });
}
