import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const messagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: messagesCreate };
  },
}));

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function assistantJson(payload: { summary: string; action_items: string[] }) {
  return {
    id: "msg_test",
    type: "message" as const,
    role: "assistant" as const,
    model: "test-model",
    stop_reason: "end_turn" as const,
    usage: { input_tokens: 1, output_tokens: 10 },
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
  };
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-api-key";
    process.env.ANTHROPIC_MODEL = "test-model";
    delete process.env.MAX_TEXT_LENGTH;
    messagesCreate.mockResolvedValue(
      assistantJson({
        summary: "A concise summary.",
        action_items: ["First", "Second", "Third"],
      })
    );
  });

  afterEach(() => {
    delete process.env.MAX_TEXT_LENGTH;
  });

  it("returns 200 with summary and three action items", async () => {
    const res = await POST(
      jsonRequest({ text: "  Plan the sprint and assign owners.  " })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      summary: string;
      action_items: string[];
    };
    expect(body.summary).toBe("A concise summary.");
    expect(body.action_items).toEqual(["First", "Second", "Third"]);
    expect(messagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: expect.stringContaining("Plan the sprint"),
          },
        ],
      })
    );
  });

  it("parses model output when wrapped in markdown fences", async () => {
    messagesCreate.mockResolvedValue({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "test-model",
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 10 },
      content: [
        {
          type: "text",
          text: '```json\n{"summary":"S","action_items":["a","b","c"]}\n```',
        },
      ],
    });
    const res = await POST(jsonRequest({ text: "hello" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { summary: string };
    expect(body.summary).toBe("S");
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid JSON body");
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not an object", async () => {
    const res = await POST(jsonRequest([]));
    expect(res.status).toBe(400);
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when text is missing", async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("text field is required");
  });

  it("returns 400 when text is null", async () => {
    const res = await POST(jsonRequest({ text: null }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is not a string", async () => {
    const res = await POST(jsonRequest({ text: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is only whitespace", async () => {
    const res = await POST(jsonRequest({ text: "   \n\t  " }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("text must not be empty");
  });

  it("returns 400 when text exceeds MAX_TEXT_LENGTH", async () => {
    process.env.MAX_TEXT_LENGTH = "5";
    const res = await POST(jsonRequest({ text: "123456" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("text exceeds maximum length");
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(jsonRequest({ text: "hi" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Server configuration error");
  });

  it("returns 500 when ANTHROPIC_MODEL is missing", async () => {
    delete process.env.ANTHROPIC_MODEL;
    const res = await POST(jsonRequest({ text: "hi" }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the model API throws", async () => {
    messagesCreate.mockRejectedValue(new Error("upstream"));
    const res = await POST(jsonRequest({ text: "hi" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Failed to complete analysis");
  });

  it("returns 500 when model output is not valid JSON", async () => {
    messagesCreate.mockResolvedValue({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "test-model",
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 10 },
      content: [{ type: "text", text: "Here is your JSON: not-really" }],
    });
    const res = await POST(jsonRequest({ text: "hi" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Failed to parse model response");
  });

  it("returns 500 when model JSON has wrong action_items length", async () => {
    messagesCreate.mockResolvedValue(
      assistantJson({ summary: "ok", action_items: ["only", "two"] })
    );
    const res = await POST(jsonRequest({ text: "hi" }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid model output");
  });

  it("concatenates multiple text blocks from the assistant", async () => {
    const full = JSON.stringify({
      summary: "S",
      action_items: ["a", "b", "c"],
    });
    const mid = Math.floor(full.length / 2);
    messagesCreate.mockResolvedValue({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: "test-model",
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 10 },
      content: [
        { type: "text", text: full.slice(0, mid) },
        { type: "text", text: full.slice(mid) },
      ],
    });
    const res = await POST(jsonRequest({ text: "hi" }));
    expect(res.status).toBe(200);
  });
});
