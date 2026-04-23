import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseAnalyzePayload } from "@/lib/parse-model-response";

export const runtime = "nodejs";

function getMaxTextLength(): number {
  const raw = process.env.MAX_TEXT_LENGTH;
  if (raw === undefined || raw === "") return 10_000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 10_000;
}

const SYSTEM_PROMPT = `Analyze the following text and respond with ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence summary",
  "action_items": ["item 1", "item 2", "item 3"]
}

Do not include any explanation, markdown formatting, or code fences.`;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getTextFromMessage(content: Anthropic.Message["content"]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("").trim();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("text field is required", 400);
  }

  const textField = (body as Record<string, unknown>).text;
  if (textField === undefined || textField === null) {
    return jsonError("text field is required", 400);
  }

  if (typeof textField !== "string") {
    return jsonError("text field is required", 400);
  }

  const text = textField.trim();
  if (text.length === 0) {
    return jsonError("text must not be empty", 400);
  }

  if (text.length > getMaxTextLength()) {
    return jsonError("text exceeds maximum length", 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!apiKey) {
    return jsonError("Server configuration error", 500);
  }
  if (!model) {
    return jsonError("Server configuration error", 500);
  }

  const client = new Anthropic({ apiKey });

  let rawAssistant: string;
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Text:\n${text}`,
        },
      ],
    });
    rawAssistant = getTextFromMessage(message.content);
  } catch {
    return jsonError("Failed to complete analysis", 500);
  }

  const parsed = parseAnalyzePayload(rawAssistant);
  if (!parsed.ok) {
    return jsonError(parsed.reason, 500);
  }

  return NextResponse.json({
    summary: parsed.data.summary,
    action_items: parsed.data.action_items,
  });
}
