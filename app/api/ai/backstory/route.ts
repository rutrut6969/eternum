import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth/options";
import { getOpenAIClient, openAIModel } from "@/lib/ai/openai";
import { backstorySystemPrompt } from "@/lib/ai/prompts";

const schema = z.object({
  backstory: z.string().min(100).max(8000)
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Backstory must be between 100 and 8000 characters." }, { status: 400 });

  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: openAIModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: backstorySystemPrompt },
      { role: "user", content: parsed.data.backstory }
    ]
  });

  return NextResponse.json({ suggestion: JSON.parse(completion.choices[0]?.message.content || "{}") });
}
