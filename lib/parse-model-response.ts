/**
 * Strips common markdown code fences from LLM output before JSON.parse.
 */
export function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "");
  s = s.replace(/\s*```$/m, "");
  return s.trim();
}

export type AnalyzeSuccess = {
  summary: string;
  action_items: [string, string, string];
};

/** Spec requires exactly three non-empty strings; any other length fails closed (see README Future improvements). */
export function parseAnalyzePayload(
  raw: string
): { ok: true; data: AnalyzeSuccess } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFences(raw));
  } catch {
    return { ok: false, reason: "Failed to parse model response" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "Invalid model output" };
  }

  const obj = parsed as Record<string, unknown>;
  const summary = obj.summary;
  const actionItems = obj.action_items;

  if (typeof summary !== "string" || summary.length === 0) {
    return { ok: false, reason: "Invalid model output" };
  }

  if (!Array.isArray(actionItems) || actionItems.length !== 3) {
    return { ok: false, reason: "Invalid model output" };
  }

  if (!actionItems.every((x) => typeof x === "string" && x.length > 0)) {
    return { ok: false, reason: "Invalid model output" };
  }

  return {
    ok: true,
    data: {
      summary,
      action_items: actionItems as [string, string, string],
    },
  };
}
