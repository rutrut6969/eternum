import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { validateImageUpload } from "@/lib/uploads";

export async function POST(request: Request, context: { params: Promise<{ homebrewId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { homebrewId } = await context.params;

  const content = await prisma.homebrewContent.findUnique({
    where: { id: homebrewId },
    include: { campaign: { include: { members: true } } }
  });
  if (!content) return NextResponse.json({ error: "Homebrew not found." }, { status: 404 });

  const membership = content.campaign?.members.find((member) => member.userId === userId);
  const canAttach = content.authorId === userId || (membership && hasDmPermission(membership.roles));
  if (!canAttach) return NextResponse.json({ error: "Only authors or DMs can attach images." }, { status: 403 });
  if (content.status === "APPROVED_PUBLIC" || content.status === "ARCHIVED") {
    return NextResponse.json({ error: "Images can only be attached before public approval or archive." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const imagePrompt = String(formData.get("imagePrompt") ?? content.imagePrompt ?? "");
  const imageAltText = String(formData.get("imageAltText") ?? content.imageAltText ?? content.title);
  const generatedByAi = String(formData.get("generatedByAi") ?? "false") === "true";
  const validation = validateImageUpload(file instanceof File ? file : null);
  if (!validation.valid || !(file instanceof File)) {
    return NextResponse.json({ error: validation.message || "Invalid image." }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob storage is not configured." }, { status: 500 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`homebrew/${content.id}/${Date.now()}-${safeName}`, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  const homebrew = await prisma.homebrewContent.update({
    where: { id: content.id },
    data: {
      imageUrl: blob.url,
      imagePrompt,
      imageAltText,
      generatedByAi
    }
  });

  return NextResponse.json({ homebrew, imageUrl: blob.url });
}
