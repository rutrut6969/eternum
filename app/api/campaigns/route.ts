import { CampaignRole, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { withRandomSuffix } from "@/lib/slug";

const createSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  settings: z.record(z.unknown()).optional()
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: {
      archivedAt: null,
      members: { some: { userId } }
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      characters: { where: { ownerId: userId } },
      invites: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" } },
      _count: { select: { diceRolls: true, approvals: true } }
    },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user?.emailVerified) return NextResponse.json({ error: "Verify your email before creating campaigns." }, { status: 403 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid campaign details." }, { status: 400 });

  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.data.name,
      slug: withRandomSuffix(parsed.data.name),
      description: parsed.data.description,
      settings: (parsed.data.settings ?? {}) as Prisma.InputJsonValue,
      ownerId: userId,
      members: {
        create: {
          userId,
          roles: [CampaignRole.DM, CampaignRole.PLAYER]
        }
      }
    },
    include: { members: true }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { globalRoles: { set: ["PLAYER", "DM"] } }
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
