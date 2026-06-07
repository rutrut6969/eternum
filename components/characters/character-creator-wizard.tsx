"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormField, FormSection, SelectField, SubmitBar, TextAreaField, TextInput } from "@/components/ui/form";
import { ResourceBars } from "@/components/resource-bars";
import { fromCopper, toCopper } from "@/lib/currency/conversion";
import { calculateMana, calculateStamina, type CastingAbility } from "@/lib/rules/resources";

type CampaignOption = { id: string; name: string };
type SpeciesOption = {
  slug: string;
  name: string;
  description?: string;
  speed?: number | null;
  sourceLabel: string;
  traits: Array<{ name: string; description?: string }>;
  languages: string[];
  proficiencies: string[];
  abilityScoreSuggestions: string[];
};

const steps = ["Identity", "Species", "Backstory", "Attributes", "Training", "Review"];
const focusOptions = ["Weapons", "Nature Magic", "Taming", "Blacksmithing", "Stealth", "Necromancy", "Arcane Research", "Alchemy", "Herbalism", "Mining", "Artificing", "Holy Magic"];

export function CharacterCreatorWizard({ campaigns }: { campaigns: CampaignOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [speciesOptions, setSpeciesOptions] = useState<SpeciesOption[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    campaignId: campaigns[0]?.id ?? "",
    name: "",
    displayTitle: "",
    portraitUrl: "",
    speciesSlug: "",
    backstory: "",
    castingAbility: "WIS" as CastingAbility,
    archetypeSuggestion: "",
    trainingFocus: ["Weapons"] as string[],
    scores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    startingCurrency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }
  });

  useEffect(() => {
    fetch("/api/srd/species")
      .then((response) => response.json())
      .then((body) => setSpeciesOptions(body.species ?? []))
      .catch(() => setSpeciesOptions([]));
  }, []);

  const selectedSpecies = speciesOptions.find((species) => species.slug === form.speciesSlug);
  const scores = { str: form.scores.strength, dex: form.scores.dexterity, con: form.scores.constitution, int: form.scores.intelligence, wis: form.scores.wisdom, cha: form.scores.charisma };
  const mana = calculateMana(1, scores, form.castingAbility);
  const stamina = calculateStamina(1, scores);
  const startingCopper = useMemo(() => toCopper(form.startingCurrency), [form.startingCurrency]);
  const startingDisplay = fromCopper(startingCopper);

  function setScore(key: keyof typeof form.scores, value: number) {
    setForm((current) => ({ ...current, scores: { ...current.scores, [key]: value } }));
  }

  function toggleFocus(focus: string) {
    setForm((current) => ({
      ...current,
      trainingFocus: current.trainingFocus.includes(focus)
        ? current.trainingFocus.filter((item) => item !== focus)
        : [...current.trainingFocus, focus]
    }));
  }

  async function createCharacter() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/characters/create-wizard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ancestry: selectedSpecies?.name,
        speciesSource: selectedSpecies?.sourceLabel,
        speciesTraits: selectedSpecies?.traits ?? []
      })
    });
    const body = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(body.error || "Could not create character.");
      return;
    }
    router.push("/dashboard/characters");
    router.refresh();
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="mana">Classless Creator</Badge>
          <h2 className="mt-4 text-2xl font-bold text-white">Guided character creation</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">Build from identity, species, backstory, attributes, and training. Archetypes emerge from choices instead of fixed class boxes.</p>
        </div>
        <Badge tone="gold">Step {step + 1} / {steps.length}</Badge>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map((label, index) => (
          <button key={label} className={`rounded-md border px-3 py-2 text-sm ${index === step ? "border-aureate/40 bg-aureate/10 text-aureate" : "border-white/10 bg-black/20 text-zinc-400"}`} onClick={() => setStep(index)} type="button">
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {step === 0 ? (
          <FormSection title="Identity" description="Choose the character’s table identity and campaign home.">
            <FormField id="campaignId" label="Campaign" required help="Characters belong to campaigns so gameplay data stays character-owned and campaign-scoped.">
              <SelectField id="campaignId" value={form.campaignId} onChange={(event) => setForm({ ...form, campaignId: event.target.value })} required>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </SelectField>
            </FormField>
            <FormField id="name" label="Character name" required>
              <TextInput id="name" placeholder="Kaelen Voss" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="displayTitle" label="Title or nickname" help="Optional table-facing flavor, not a fixed class.">
                <TextInput id="displayTitle" placeholder="Ashbound Wanderer" value={form.displayTitle} onChange={(event) => setForm({ ...form, displayTitle: event.target.value })} />
              </FormField>
              <FormField id="portraitUrl" label="Portrait URL">
                <TextInput id="portraitUrl" placeholder="https://..." value={form.portraitUrl} onChange={(event) => setForm({ ...form, portraitUrl: event.target.value })} />
              </FormField>
            </div>
          </FormSection>
        ) : null}

        {step === 1 ? (
          <FormSection title="Species / Ancestry" description="SRD/Open5e-compatible data is labeled separately from homebrew and stored as a source reference.">
            <FormField id="species" label="Species option" help="Only SRD/Open5e-compatible content should appear here.">
              <SelectField id="species" value={form.speciesSlug} onChange={(event) => setForm({ ...form, speciesSlug: event.target.value })}>
                <option value="">Custom or undecided ancestry</option>
                {speciesOptions.map((species) => <option key={species.slug} value={species.slug}>{species.name}</option>)}
              </SelectField>
            </FormField>
            {selectedSpecies ? (
              <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="mana">{selectedSpecies.sourceLabel}</Badge>
                  {selectedSpecies.speed ? <Badge tone="gold">Speed {selectedSpecies.speed}</Badge> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{selectedSpecies.description || "No description provided by the SRD source."}</p>
                <p className="mt-3 text-xs text-zinc-500">Traits: {selectedSpecies.traits.map((trait) => trait.name).join(", ") || "none listed"}</p>
                <p className="mt-1 text-xs text-zinc-500">Languages: {selectedSpecies.languages.join(", ") || "none listed"}</p>
              </div>
            ) : null}
          </FormSection>
        ) : null}

        {step === 2 ? (
          <FormSection title="Backstory" description="Write the story first. AI analysis can later suggest professions, traits, flaws, affinities, and starting items for DM review.">
            <FormField id="backstory" label="Backstory">
              <TextAreaField id="backstory" className="min-h-56" placeholder="Raised among river ruins, trained by a smith, bonded with a wounded hawk..." value={form.backstory} onChange={(event) => setForm({ ...form, backstory: event.target.value })} />
            </FormField>
          </FormSection>
        ) : null}

        {step === 3 ? (
          <FormSection title="Attributes" description="Set starting ability scores and preview Eternum mana/stamina.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(form.scores).map(([key, value]) => (
                <FormField key={key} id={key} label={key.replace(/^\w/, (letter) => letter.toUpperCase())} required>
                  <TextInput id={key} type="number" min={3} max={20} value={value} onChange={(event) => setScore(key as keyof typeof form.scores, Number(event.target.value))} />
                </FormField>
              ))}
            </div>
            <FormField id="castingAbility" label="Primary magical focus" required help="This affects mana only; it is not a class choice.">
              <SelectField id="castingAbility" value={form.castingAbility} onChange={(event) => setForm({ ...form, castingAbility: event.target.value as CastingAbility })}>
                <option value="WIS">Wisdom</option>
                <option value="INT">Intelligence</option>
                <option value="CHA">Charisma</option>
              </SelectField>
            </FormField>
            <ResourceBars mana={mana} stamina={stamina} />
          </FormSection>
        ) : null}

        {step === 4 ? (
          <FormSection title="Training focus" description="Pick what they actually trained. The app uses these as suggestions for professions, affinities, and future archetype labels.">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {focusOptions.map((focus) => (
                <button key={focus} className={`rounded-md border px-3 py-3 text-left text-sm font-semibold ${form.trainingFocus.includes(focus) ? "border-mana/40 bg-mana/10 text-mana" : "border-white/10 bg-black/20 text-zinc-300"}`} onClick={() => toggleFocus(focus)} type="button">
                  {focus}
                </button>
              ))}
            </div>
            <FormField id="archetype" label="Suggested archetype label" help="Optional flavor like Druid, Fighter, Necromancer, or Spellblade. Not a fixed class.">
              <TextInput id="archetype" placeholder="Nature-bound Smith" value={form.archetypeSuggestion} onChange={(event) => setForm({ ...form, archetypeSuggestion: event.target.value })} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-5">
              {(["cp", "sp", "ep", "gp", "pp"] as const).map((denomination) => (
                <FormField key={denomination} id={denomination} label={denomination.toUpperCase()}>
                  <TextInput id={denomination} type="number" min={0} value={form.startingCurrency[denomination]} onChange={(event) => setForm({ ...form, startingCurrency: { ...form.startingCurrency, [denomination]: Number(event.target.value) } })} />
                </FormField>
              ))}
            </div>
            <p className="text-sm text-zinc-400">Starting wallet: {startingDisplay.pp} PP {startingDisplay.gp} GP {startingDisplay.ep} EP {startingDisplay.sp} SP {startingDisplay.cp} CP</p>
          </FormSection>
        ) : null}

        {step === 5 ? (
          <FormSection title="Review" description="Review the character before creating. DM approval is still needed for AI/backstory-granted mechanical bonuses.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <h3 className="font-bold text-white">{form.name || "Unnamed character"}</h3>
                <p className="mt-2 text-sm text-zinc-400">{selectedSpecies?.name || "Custom ancestry"} / {form.archetypeSuggestion || "Classless archetype pending"}</p>
                <p className="mt-2 text-xs text-zinc-500">Training: {form.trainingFocus.join(", ") || "none selected"}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-zinc-300">Mana {mana} / Stamina {stamina}</p>
                <p className="mt-2 text-sm text-zinc-300">Starting wallet {startingCopper} CP</p>
                <p className="mt-2 text-xs text-zinc-500">Source: {selectedSpecies?.sourceLabel ?? "custom ancestry"}</p>
              </div>
            </div>
          </FormSection>
        ) : null}
      </div>

      {message ? <p className="mt-5 rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{message}</p> : null}
      <SubmitBar>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button className="rounded-md border border-white/10 px-4 py-3 font-semibold text-zinc-100 disabled:opacity-40" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button">Back</button>
          {step < steps.length - 1 ? (
            <button className="rounded-md bg-mana px-4 py-3 font-semibold text-void" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} type="button">Continue</button>
          ) : (
            <button className="rounded-md bg-aureate px-4 py-3 font-semibold text-void disabled:opacity-60" disabled={loading || !form.name || !form.campaignId} onClick={createCharacter} type="button">
              {loading ? "Creating..." : "Create character"}
            </button>
          )}
        </div>
      </SubmitBar>
    </Card>
  );
}

