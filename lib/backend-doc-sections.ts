/**
 * Annotated snippets for the /backend reviewer page.
 * Mirrors production logic in app/api/analyze/route.ts and lib/parse-model-response.ts.
 * Update when those files change materially.
 */

export type BackendDocSection = {
  id: string;
  title: string;
  /** Short prose shown above the code block */
  summary: string;
  /** Heavily commented TypeScript for copy/paste and search */
  code: string;
};

export const BACKEND_DOC_SECTIONS: BackendDocSection[] = [
  {
    id: "file-and-runtime",
    title: "1. File location and Node runtime",
    summary:
      "The handler lives in the App Router at app/api/analyze/route.ts. It must run on Node so the Anthropic SDK behaves like production on Vercel.",
    code: `// app/api/analyze/route.ts

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseAnalyzePayload } from "@/lib/parse-model-response";

// Force Node.js serverless runtime (not Edge) — required for @anthropic-ai/sdk.
export const runtime = "nodejs";

// ... handler implementation below`,
  },
  {
    id: "limits-and-prompt",
    title: "2. Input limit and system prompt",
    summary:
      "MAX_TEXT_LENGTH is read per request so tests can override without module reload. The system prompt locks the model to a single JSON shape.",
    code: `// --- Input size cap (default 10_000 chars after trim) ---
function getMaxTextLength(): number {
  const raw = process.env.MAX_TEXT_LENGTH;
  if (raw === undefined || raw === "") return 10_000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 10_000;
}

// --- System prompt: JSON-only contract (no fences, no prose) ---
const SYSTEM_PROMPT = \`Analyze the following text and respond with ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence summary",
  "action_items": ["item 1", "item 2", "item 3"]
}

Do not include any explanation, markdown formatting, or code fences.\`;

// Real handler user message: \`Text:\\n\$\{text\}\` — contract in system, untrusted doc in user
// (higher authority on system reduces prompt-injection vs mixing both in one message).`,
  },
  {
    id: "parse-request",
    title: "3. Parse JSON body and validate text",
    summary:
      "Invalid JSON → 400. Missing or wrong-typed text → 400. Empty after trim or over max length → 400. Stable { error: string } shape for every client error.",
    code: `// --- Small helper: structured error JSON ---
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  // Parse body; malformed JSON is a client error.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  // Must be a plain object (not array / null).
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("text field is required", 400);
  }

  const textField = (body as Record<string, unknown>).text;

  // text must exist and be a string (null / number / missing → 400).
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

  // ... env + Anthropic call next`,
  },
  {
    id: "anthropic",
    title: "4. Call Anthropic and read assistant text",
    summary:
      "Missing ANTHROPIC_API_KEY or ANTHROPIC_MODEL → 500 (misconfiguration). SDK errors → generic 500 so internal details are not leaked. Assistant `content` is a block array, not one string—see `getTextFromMessage`.",
    code: `  const apiKey = process.env.ANTHROPIC_API_KEY;
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
    // System = trusted contract; user = untrusted document only (README Prompt design).
    const message = await client.messages.create({
      model,
      max_tokens: 1024, // Cap cost / verbosity for this take-home.
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: \`Text:\\n\$\{text\}\`,
        },
      ],
    });
    rawAssistant = getTextFromMessage(message.content);
  } catch {
    // Do not expose upstream error strings to untrusted clients.
    return jsonError("Failed to complete analysis", 500);
  }

/**
 * SDK: \`content\` is ContentBlock[], not a plain string—multiple \`text\` chunks or
 * other types (e.g. tool_use) may appear; we join all \`text\` blocks and ignore the rest here.
 */
function getTextFromMessage(content: Anthropic.Message["content"]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("").trim();
}`,
  },
  {
    id: "parse-model",
    title: "5. Parse model output (lib/parse-model-response.ts)",
    summary:
      "Strip markdown fences the model sometimes adds anyway, then JSON.parse. Validate exact shape: non-empty summary and exactly three non-empty string action items—anything else is 500 (even useful extra items; see README Future improvements).",
    code: `// lib/parse-model-response.ts — shared by the route handler

/** Strip markdown code fences before JSON.parse. */
export function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^${"```"}(?:json)?\\s*/i, "");
  s = s.replace(/\\s*${"```"}$/m, "");
  return s.trim();
}

export function parseAnalyzePayload(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(raw));
  } catch {
    return { ok: false as const, reason: "Failed to parse model response" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false as const, reason: "Invalid model output" };
  }

  const obj = parsed as Record<string, unknown>;
  const summary = obj.summary;
  const actionItems = obj.action_items;

  if (typeof summary !== "string" || summary.length === 0) {
    return { ok: false as const, reason: "Invalid model output" };
  }

  if (!Array.isArray(actionItems) || actionItems.length !== 3) {
    return { ok: false as const, reason: "Invalid model output" };
  }

  if (!actionItems.every((x) => typeof x === "string" && x.length > 0)) {
    return { ok: false as const, reason: "Invalid model output" };
  }

  return {
    ok: true as const,
    data: {
      summary,
      action_items: actionItems as [string, string, string],
    },
  };
}`,
  },
  {
    id: "respond",
    title: "6. Success and error responses",
    summary:
      "On parse failure, return the reason from parseAnalyzePayload as 500. On success, return 200 with summary and action_items (snake_case) matching the take-home contract.",
    code: `  const parsed = parseAnalyzePayload(rawAssistant);
  if (!parsed.ok) {
    return jsonError(parsed.reason, 500);
  }

  return NextResponse.json({
    summary: parsed.data.summary,
    action_items: parsed.data.action_items,
  });
}`,
  },
];
