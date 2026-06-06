import { deriveTierFromMana, tierManaCost } from "@/lib/rules/spells";

type SrdSpellLike = {
  name: string;
  level?: string | number;
  school?: string;
  casting_time?: string;
  castingTime?: string;
  range?: string;
  duration?: string;
  desc?: string;
};

export function convertSrdSpellToEternum(spell: SrdSpellLike) {
  const numericLevel = typeof spell.level === "number" ? spell.level : Number.parseInt(String(spell.level ?? "1"), 10);
  const tier = deriveTierFromMana(Math.max(5, (Number.isFinite(numericLevel) ? numericLevel : 1) * 10));
  const description = spell.desc ?? "";
  const saveAttackMatch = description.match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw|spell attack/iu);

  return {
    source: "open5e",
    name: spell.name,
    school: spell.school ?? "Unknown",
    tier,
    manaCost: tierManaCost[tier],
    castingTime: spell.casting_time ?? spell.castingTime ?? "Action",
    range: spell.range ?? "Self",
    duration: spell.duration ?? "Instantaneous",
    saveOrAttack: saveAttackMatch?.[0] ?? "Rules text",
    description,
    infusionOptions: [
      { target: "damage", cost: 5, tradeoff: "Extra damage cannot also expand area." },
      { target: "range", cost: 5, tradeoff: "Range infusion does not increase damage." },
      { target: "duration", cost: 10, tradeoff: "Longer duration may require concentration." }
    ]
  };
}
