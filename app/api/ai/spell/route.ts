import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { spellSystemPrompt } from "@/lib/ai/prompts";
import { getOpenAIClient, openAIModel } from "@/lib/ai/openai";
import { authOptions } from "@/lib/auth/options";
import { calculateInfusedSpell, deriveTierFromMana } from "@/lib/rules/spells";

const schema = z.object({
  idea: z.string().min(20).max(4000),
  baseManaIntent: z.number().int().min(1).max(120).default(5)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid spell idea." }, { status: 400 });

  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: openAIModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: spellSystemPrompt },
      { role: "user", content: parsed.data.idea }
    ]
  });

  const formatted = JSON.parse(completion.choices[0]?.message.content || "{}");
  const baseTier = deriveTierFromMana(parsed.data.baseManaIntent);
  const rules = calculateInfusedSpell(baseTier, []);

  return NextResponse.json({ formatted, rules, approvalRequired: true });
}
