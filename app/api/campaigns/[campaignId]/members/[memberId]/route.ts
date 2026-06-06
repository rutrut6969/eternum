import { CampaignRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import { requireCampaignDm } from "@/lib/campaign-auth";
import { normalizeRoles, wouldRemoveFinalDm } from "@/lib/member-roles";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  roles: z.array(z.enum(["DM", "PLAYER", "ASSISTANT_DM", "SPECTATOR"])).min(1)
});

export async function PATCH(_request: Request, context: { params: Promise<{ campaignId: string; memberId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { campaignId, memberId } = await context.params;

  try {
    await requireCampaignDm(campaignId, userId);
  } catch {
    return NextResponse.json({ error: "DM permission required." }, { status: 403 });
  }

  const parsed = schema.safeParse(await _request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid roles." }, { status: 400 });

  const members = await prisma.campaignMember.findMany({ where: { campaignId } });
  const target = members.find((member) => member.id === memberId);
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  const nextRoles = normalizeRoles(parsed.data.roles as CampaignRole[]);
  if (wouldRemoveFinalDm({ actingUserId: userId, target, allMembers: members, nextRoles })) {
    return NextResponse.json({ error: "Add another DM before removing your own final DM role." }, { status: 400 });
  }

  const member = await prisma.campaignMember.update({
    where: { id: target.id },
    data: { roles: { set: nextRoles } },
    include: { user: { select: { id: true, name: true, email: true, username: true } } }
  });

  return NextResponse.json({ member });
}
