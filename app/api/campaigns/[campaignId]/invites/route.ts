import { CampaignRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";

const inviteSchema = z.object({
  email: z.string().email(),
  roles: z.array(z.enum(["DM", "PLAYER", "ASSISTANT_DM", "SPECTATOR"])).min(1).default(["PLAYER"])
});

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId } = await params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid invite." }, { status: 400 });

  const invite = await prisma.campaignInvite.create({
    data: {
      campaignId,
      email: parsed.data.email.toLowerCase(),
      roles: parsed.data.roles as CampaignRole[],
      token: randomBytes(24).toString("hex"),
      invitedById: userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
    }
  });

  return NextResponse.json({ invite }, { status: 201 });
}
