import { notFound, redirect } from "next/navigation";
import { MapBuilderShell } from "@/components/maps/map-builder-shell";
import { Badge } from "@/components/ui/badge";
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
    <main className="mx-auto max-w-[1680px] px-4 py-7 sm:px-5 sm:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge tone="mana">Editable VTT map</Badge>
          <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{map.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">
            Rooms, corridors, terrain, notes, and spawn points are stored as structured layer data so the map can keep evolving.
          </p>
        </div>
        <Badge tone={canEdit ? "stamina" : "gold"}>{canEdit ? "Editable" : "View only"}</Badge>
      </div>
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
    </main>
  );
}
