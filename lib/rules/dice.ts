import { randomInt } from "crypto";

export type DiceVisibility = "dm_only" | "roller_and_dm" | "party_visible" | "public";

export type RollResult = {
  expression: string;
  total: number;
  detail: Array<{ count: number; sides: number; rolls: number[] }>;
  modifier: number;
};

const dicePattern = /([+-]?\d*)d(\d+)/gi;

export function rollDiceExpression(expression: string): RollResult {
  const normalized = expression.replace(/\s+/g, "");
  let total = 0;
  const detail: RollResult["detail"] = [];
  let consumed = normalized;

  for (const match of normalized.matchAll(dicePattern)) {
    const rawCount = match[1];
    const count = rawCount === "" || rawCount === "+" ? 1 : rawCount === "-" ? -1 : Number(rawCount);
    const sides = Number(match[2]);

    if (!Number.isInteger(count) || !Number.isInteger(sides) || sides < 2 || Math.abs(count) > 100) {
      throw new Error("Invalid dice expression.");
    }

    const rolls = Array.from({ length: Math.abs(count) }, () => randomInt(1, sides + 1));
    const signedTotal = rolls.reduce((sum, value) => sum + value, 0) * Math.sign(count);
    total += signedTotal;
    detail.push({ count, sides, rolls });
    consumed = consumed.replace(match[0], "");
  }

  const modifier = consumed
    .split(/(?=[+-])/)
    .filter(Boolean)
    .reduce((sum, token) => {
      if (!/^[+-]?\d+$/.test(token)) throw new Error("Only dice terms and flat numeric modifiers are supported.");
      return sum + Number(token);
    }, 0);

  return { expression, total: total + modifier, detail, modifier };
}
