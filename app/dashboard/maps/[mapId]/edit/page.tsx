import { notFound, redirect } from "next/navigation";
import { MapBuilderShell } from "@/components/maps/map-builder-shell";
import { requireUser } from "@/lib/auth/session";
import { hasDmPermission } from "@/lib/campaign-auth";
import { prisma } from "@/lib/prisma";
import { subscriptionService } from "@/lib/subscriptions/service";
import type { MapElement } from "@/lib/maps/blueprint-schema";

function layerElements(data: unknown): MapElement[] {
  const maybe = data as { elements?: unknown[] } | null;
  return Array.isArray(maybe?.elements) ? (maybe.elements as MapElement[]) : [];
}

export default async function EditMapPage({ params }: { params: Promise<{ mapId: string }> }) {
  const user = await requireUser();
  const { mapId } = await params;
  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: {
      campaign: { include: { members: true } },
      layers: { orderBy: { order: "asc" } }
    }
  });

  if (!map) notFound();

  const isFounder = await subscriptionService.isFounder(user.id);
  const membership = map.campaign?.members.find((member) => member.userId === user.id);
  const canView = isFounder || map.createdById === user.id || Boolean(membership);
  const canEdit = isFounder || map.createdById === user.id || Boolean(membership && hasDmPermission(membership.roles));
  if (!canView) redirect("/dashboard/maps");

  return (
    <MapBuilderShell
      canEdit={canEdit}
      initialMap={{
        id: map.id,
        name: map.name,
        description: map.description,
        sourceType: map.sourceType,
        gridType: map.gridType,
        gridWidth: map.gridWidth,
        gridHeight: map.gridHeight,
        theme: map.theme,
        environment: map.environment,
        lightingNotes: map.lightingNotes,
        interactiveNotes: map.interactiveNotes,
        editorState: map.editorState as Record<string, unknown>,
        layers: map.layers.map((layer) => ({
          id: layer.id,
          name: layer.name,
          order: layer.order,
          visible: layer.visible,
          locked: layer.locked,
          data: { elements: layerElements(layer.data) }
        }))
      }}
    />
  );
}
