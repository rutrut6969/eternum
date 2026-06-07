import { Badge } from "@/components/ui/badge";
import { MapCreationWorkspace } from "@/components/maps/map-creation-workspace";
import { requireUser } from "@/lib/auth/session";

export default async function NewMapPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-5 sm:py-10">
      <Badge tone="mana">Map Builder</Badge>
      <h1 className="mt-5 text-3xl font-black text-white sm:text-4xl">Create an editable map</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
        Start manually, generate a structured AI blueprint, use an uploaded image as a reference, or combine AI drafting with DM editing.
      </p>
      <section className="mt-8">
        <MapCreationWorkspace />
      </section>
    </main>
  );
}

