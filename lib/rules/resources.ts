export type CastingAbility = "CHA" | "INT" | "WIS";

export type AbilityScores = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

export function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

export function calculateMana(level: number, scores: AbilityScores, castingAbility: CastingAbility) {
  const base = 20 + level * 5;
  const mods = {
    CHA: abilityModifier(scores.cha) * 10 + abilityModifier(scores.int) * 3 + abilityModifier(scores.wis) * 3,
    INT: abilityModifier(scores.int) * 10 + abilityModifier(scores.wis) * 3 + abilityModifier(scores.cha) * 3,
    WIS: abilityModifier(scores.wis) * 10 + abilityModifier(scores.int) * 3 + abilityModifier(scores.cha) * 3
  };

  return Math.max(0, base + mods[castingAbility]);
}

export function calculateStamina(level: number, scores: AbilityScores) {
  return Math.max(
    0,
    20 + level * 5 + abilityModifier(scores.con) * 10 + abilityModifier(scores.str) * 3 + abilityModifier(scores.dex) * 3
  );
}
