import { describe, it, expect } from "vitest";
import {
  stripMarkdownFences,
  parseAnalyzePayload,
} from "./parse-model-response";

describe("stripMarkdownFences", () => {
  it("returns trimmed plain JSON unchanged", () => {
    const raw = `  {"a":1}  `;
    expect(stripMarkdownFences(raw)).toBe('{"a":1}');
  });

  it("strips ```json ... ``` wrapper", () => {
    const raw = "```json\n{\"x\":1}\n```";
    expect(stripMarkdownFences(raw)).toBe('{"x":1}');
  });

  it("strips ``` ... ``` without json label", () => {
    const raw = "```\n{\"x\":1}\n```";
    expect(stripMarkdownFences(raw)).toBe('{"x":1}');
  });

  it("handles case-insensitive json fence label", () => {
    const raw = "```JSON\n{\"x\":1}\n```";
    expect(stripMarkdownFences(raw)).toBe('{"x":1}');
  });
});

describe("parseAnalyzePayload", () => {
  it("accepts valid minimal JSON", () => {
    const raw = JSON.stringify({
      summary: "One summary.",
      action_items: ["a", "b", "c"],
    });
    const out = parseAnalyzePayload(raw);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.summary).toBe("One summary.");
      expect(out.data.action_items).toEqual(["a", "b", "c"]);
    }
  });

  it("accepts JSON wrapped in markdown fences", () => {
    const inner = JSON.stringify({
      summary: "S",
      action_items: ["1", "2", "3"],
    });
    const out = parseAnalyzePayload(`\n\`\`\`json\n${inner}\n\`\`\`\n`);
    expect(out.ok).toBe(true);
  });

  it("fails on invalid JSON", () => {
    const out = parseAnalyzePayload("not json");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("Failed to parse model response");
  });

  it("fails on JSON array root", () => {
    const out = parseAnalyzePayload("[]");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("Invalid model output");
  });

  it("fails on null root", () => {
    const out = parseAnalyzePayload("null");
    expect(out.ok).toBe(false);
  });

  it("fails when summary is missing", () => {
    const out = parseAnalyzePayload(
      JSON.stringify({ action_items: ["a", "b", "c"] })
    );
    expect(out.ok).toBe(false);
  });

  it("fails when summary is empty string", () => {
    const out = parseAnalyzePayload(
      JSON.stringify({ summary: "", action_items: ["a", "b", "c"] })
    );
    expect(out.ok).toBe(false);
  });

  it("fails when summary is not a string", () => {
    const out = parseAnalyzePayload(
      JSON.stringify({ summary: 1, action_items: ["a", "b", "c"] })
    );
    expect(out.ok).toBe(false);
  });

  it("fails when action_items has wrong length (2)", () => {
    const out = parseAnalyzePayload(
      JSON.stringify({ summary: "ok", action_items: ["a", "b"] })
    );
    expect(out.ok).toBe(false);
  });

  it("fails when action_items has wrong length (4)", () => {
    const out = parseAnalyzePayload(
      JSON.stringify({
        summary: "ok",
        action_items: ["a", "b", "c", "d"],
      })
    );
    expect(out.ok).toBe(false);
  });

  it("fails when an action item is empty", () => {
    const out = parseAnalyzePayload(
      JSON.stringify({ summary: "ok", action_items: ["a", "", "c"] })
    );
    expect(out.ok).toBe(false);
  });

  it("fails when an action item is not a string", () => {
    const out = parseAnalyzePayload(
      JSON.stringify({ summary: "ok", action_items: ["a", 2, "c"] })
    );
    expect(out.ok).toBe(false);
  });
});
