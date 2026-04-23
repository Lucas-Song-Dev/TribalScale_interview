# Text analyzer (TribalScale take-home)

Small **Next.js** app with one API route: send a block of text, get a **short summary** and **exactly three action items** as **structured JSON**. Deploys cleanly to **Vercel** (Node runtime on the route).

## What I built

- **`POST /api/analyze`** — validates input, calls **Anthropic Claude** with a single prompt that asks for JSON only, strips markdown fences when needed, parses and validates shape, returns `{ "summary", "action_items" }` or `{ "error" }`.
- **A minimal page** at `/` — **not part of the exercise brief**; it only exists so reviewers can trigger the API without `curl`. The evaluated piece is the **route handler + prompt design** (see note on the page).

## Prompt(s) used

**System message** (verbatim intent):

```text
Analyze the following text and respond with ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence summary",
  "action_items": ["item 1", "item 2", "item 3"]
}

Do not include any explanation, markdown formatting, or code fences.
```

**User message**: the input text is sent as `Text:\n{user text}` so instructions stay in `system` and the document stays in `user`.

## What did not work at first and how I adjusted

- **Models sometimes wrap JSON in fences** despite “no fences” — added a small **`stripMarkdownFences`** step before `JSON.parse` (see `lib/parse-model-response.ts`).
- **Loose parsing hid bad outputs** — enforced **exactly three non-empty string** action items and a non-empty summary; otherwise respond with **500** and a stable error message instead of partial JSON.

## What I would improve with more time

- **Anthropic tool use / structured outputs** so the model is schema-bound and fence-trimming becomes unnecessary.
- **Retry once** on parse failure with a stricter “JSON only, no prose” reminder.
- **Prompt-injection hardening** (delimiters, policy checks) and **rate limiting** for a public endpoint.
- **Contract / E2E tests** against a deployed environment or recorded Anthropic responses.

## Testing

- **`npm run test`** — Vitest in watch mode.
- **`npm run test:run`** — single CI-style run (no watch).
- **`npm run test:coverage`** — same with V8 coverage for `app/api/**` and `lib/**`.
- **GitHub Actions** — on every **pull request** and on **every push** (including the first push to a new branch), [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs **`npm run lint`** and **`npm run test:run`** on Ubuntu with Node 22.

Coverage today:

- **`lib/parse-model-response.test.ts`** — fence stripping and strict JSON shape validation.
- **`app/api/analyze/route.test.ts`** — `POST` validation, env checks, mocked Anthropic success/failure paths, fenced model output, split text blocks.
- **`app/page.test.tsx`** — reviewer disclaimer copy, submit disabled when empty, happy path and error UI with mocked `fetch`.

## Setup

1. Copy [`.env.example`](.env.example) to `.env` and set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
2. Install and run:

```bash
npm install
npm run dev
```

3. Call the API (example):

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"We agreed to ship the MVP by Friday. Alice will own the API contract. Bob will write the release notes."}'
```

On **Windows CMD**, replace `\` line endings with `^`, or run as a single line.

## API contract

**Request:** `POST /api/analyze` — `Content-Type: application/json`

```json
{ "text": "string, required" }
```

**Success — 200**

```json
{
  "summary": "Two to three sentence summary of the text.",
  "action_items": ["First action item", "Second action item", "Third action item"]
}
```

**Errors — 400 / 500**

```json
{ "error": "Human-readable error message" }
```

Validation matches the original spec: missing `text`, empty (after trim), or over **10,000** characters (override with `MAX_TEXT_LENGTH` in `.env`).

## API calls: tradeoffs, code, and performance at scale

This section is about **how and when** this handler talks to Anthropic, what was traded off, and what happens if traffic grows. The implementation lives in [`app/api/analyze/route.ts`](app/api/analyze/route.ts) and [`lib/parse-model-response.ts`](lib/parse-model-response.ts).

---

### 1. One `messages.create` call vs two (or more)

**What the code does:** a single request asks for both summary and three action items in one JSON object.

```ts
const message = await client.messages.create({
  model,
  max_tokens: 1024,
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: `Text:\n${text}` }],
});
```

| Choice | Upside | Downside |
|--------|--------|----------|
| **One call (current)** | Lower **end-to-end latency** (one network round trip + one generation). Lower **token cost** (one set of prompt + completion tokens). Simpler **failure model** (binary success/fail). | Less control if you later want **different models** or **temperature** per subtask. Harder to retry only “action items” if summary was fine. |
| **Two calls** | Can tune prompts independently; could parallelize summary vs actions (two RTTs in parallel—wall clock similar to one long call, but **2× provider RPM** and **2× billed requests**). | **~2×** worst-case latency if run sequentially. **2×** failure surface; partial UX needs stitching. |

**At scale:** provider **rate limits** and **concurrency** are usually the first wall. Doubling calls per successful analyze **doubles** Anthropic-side utilization for the same user traffic unless you cache aggressively. For **p99 latency**, two sequential calls often **add** roughly a full second model generation on top of the first.

---

### 2. Prompt-only JSON vs tool use / native structured output

**What the code does:** the model is instructed to emit JSON as plain text; the server **strips fences** and **`JSON.parse`s**, then **validates** shape strictly.

```ts
// After the model returns text:
const parsed = parseAnalyzePayload(rawAssistant);
if (!parsed.ok) {
  return jsonError(parsed.reason, 500);
}
```

Fence stripping (because models still sometimes wrap JSON):

```ts
export function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "");
  s = s.replace(/\s*```$/m, "");
  return s.trim();
}
```

| Choice | Upside | Downside |
|--------|--------|----------|
| **Prompt JSON (current)** | Minimal code, one API shape, easy to read in logs. | **Probabilistic**: occasional invalid JSON, fences, or wrong array length → **500** after you’ve already paid for tokens. |
| **Tool use / schema-enforced output** | Much lower parse-failure rate; less defensive string handling. | More boilerplate (tool schema, handling `tool_use` blocks). Slightly more complex **debugging** for reviewers unfamiliar with tools. |

**At scale:** if parse failures happen at rate `p` per request, **retries multiply traffic** by roughly `1/(1-p)` under simple retry rules—and can **amplify bursts** during incidents. Tool use is the usual production mitigation when **availability SLA** matters more than lines of code.

---

### 3. Full completion vs streaming — three different concerns (do not conflate)

**What the code does:** the handler **awaits** the full assistant message, then returns one JSON body.

```ts
const message = await client.messages.create({ /* ... */ });
rawAssistant = getTextFromMessage(message.content);
```

#### A. Node.js event loop (what actually blocks)

When the handler hits **`await client.messages.create(...)`** (or any `await` on network I/O), Node **does not busy-wait**. It schedules the outbound request, **yields**, and the event loop can keep progressing other work for that isolate. **During the wait on Anthropic**, buffering the full response vs streaming tokens **does not change** this “I/O is async” behavior—both approaches spend most of the wall clock **outside** your JavaScript.

Where **synchronous** work *does* bite is **after** bytes arrive: `JSON.parse(largeString)`, heavy validation, or huge string copies **run on the event loop** and briefly block it. For a **small bounded payload** (this route caps output with `max_tokens: 1024`), that cost is usually **microseconds**—but the mechanism matters at larger payloads (streaming parsers, worker threads, etc. become relevant).

#### B. Vercel billing, concurrency, cold starts (platform—not the event loop)

Separate from the event loop: **serverless economics and capacity** are about **how long your function is considered active** and how many concurrent executions the platform will run.

- **Billable / active time:** on Vercel, function duration pricing is tied to how long work runs in the function—including time spent **waiting on slow I/O** such as an LLM round-trip or a long streamed response. A 50ms CRUD handler is cheap noise; a **30–60s** streamed chat-style response can be **orders of magnitude** more expensive per request than intuition from “normal” APIs.
- **Saturation under spikes:** teams often hit **504** timeouts, **429** rate limits, or upstream pool exhaustion when traffic spikes—**before** Node “runs out of threads,” because the bottleneck is **concurrent long-lived invocations** and provider limits.
- **Cold starts:** a cold start **adds** fixed latency on top of model time. A few seconds of model latency plus a cold start can land **p99** in the **multi-second** range without any application-level bug.

**Fluid Compute / modern Vercel functions:** Vercel documents **Fluid Compute** and **in-function concurrency** as evolving how capacity is used for I/O-heavy workloads (better reuse of idle time and multiplexing than the naïve “one invocation pins one useless instance forever” story from early serverless mental models). **Do not** replace one oversimplification with another: read the **current** Vercel docs for your plan/runtime to see exactly what is billed and how concurrency behaves—semantics change.

#### C. Product and HTTP tradeoffs (TTFB, timeouts, parsing)

| Choice | Upside | Downside |
|--------|--------|----------|
| **Wait for full JSON (current)** | One **`JSON.parse`** on a complete document; easy contract for `curl` and simple clients; predictable response shape. | **Poor time-to-first-byte (TTFB)**—the client sees nothing until generation finishes. Long-held HTTP requests are more likely to hit **proxy, CDN, or browser idle timeouts** if the path is slow. |
| **Streaming** | **Earlier bytes to the client** (better perceived latency); can help **keep connections alive** on long generations if intermediates are tuned for chunked responses. | For **structured JSON**, you still usually **buffer** until the document is complete (or redesign the protocol). More moving parts in the client and in observability. |

**Takeaway:** streaming vs buffering here is mainly about **when you start sending bytes to the client** and **how you assemble structured output**—not about “freeing the event loop during the Anthropic wait,” because **`await` already yields** for that I/O. Platform **cost and concurrency** are a **second** axis; **parse CPU** after the response is a **third**.

---

### 4. New `Anthropic` client per request vs long-lived singleton

**What the code does:**

```ts
const client = new Anthropic({ apiKey });
```

| Choice | Upside | Downside |
|--------|--------|----------|
| **Per-request client (current)** | Stateless, safe in serverless (no stale connections across isolates). | Tiny object allocation each time (usually **noise** vs network I/O). |
| **Module-level singleton** | Micro-optimization; can reuse HTTP agent behavior depending on SDK/runtime. | Easy to get wrong across **hot reload** or multi-tenant **key rotation** if you ever support per-tenant keys. |

**At scale:** the **HTTP request to Anthropic** dominates latency and CPU. Client construction is not your bottleneck unless profiling proves otherwise.

---

### 5. Hiding upstream errors from the HTTP client

**What the code does:**

```ts
} catch {
  return jsonError("Failed to complete analysis", 500);
}
```

| Choice | Upside | Downside |
|--------|--------|----------|
| **Generic 500 (current)** | Avoids leaking **stack traces**, internal messages, or provider-specific errors to untrusted clients. | Operators need **server-side logs/metrics** (request id, model id, status code from SDK) to debug. |

**At scale:** public APIs should return **stable, coarse** errors to clients and **rich** errors to your observability pipeline. If you need client-visible error codes (e.g. `RATE_LIMITED`), map them **explicitly** from known SDK error types—never pass raw `error.message` through.

---

### 6. `max_tokens: 1024` on the completion

**What the code does:** caps the assistant output size.

```ts
max_tokens: 1024,
```

| Choice | Upside | Downside |
|--------|--------|----------|
| **Hard cap (current)** | Predictable **worst-case cost** per call; reduces risk of runaway verbosity. | Theoretically could truncate an unusually long JSON (unlikely at this schema size). |

**At scale:** caps are a **cost control** knob. If you raise limits for richer outputs, watch **p95/p99 token usage**—cost scales with tokens, not just request count.

---

### 7. Where time and money go at high QPS (mental model)

Rough **wall-clock** ordering for a typical `POST /api/analyze`:

1. **Anthropic generation latency** (often seconds, model-dependent)—dominant.
2. **Network RTT** to Anthropic.
3. **Cold start** (sometimes zero, sometimes hundreds of ms to seconds)—**additive** to p99.
4. **Your** `JSON.parse` + validation—usually **microseconds** at this output size; grows if you allow huge payloads.

**Throughput and pain:** sustainable QPS is bounded by **provider RPM/TPM**, **platform concurrent execution limits**, and **how long each invocation stays active**. Long LLM work increases **cost per request** (active duration while waiting on I/O) and makes **spike behavior** worse (504/429/pool saturation) before raw Node CPU becomes the story.

**Single-threaded event loop (risk profile):** one request doing **CPU-heavy** work (large sync parsing, big sync transforms) delays others **on that instance**. **Waiting** on the LLM via `await` is not that problem; **post-response CPU** can be, at scale.

**Caching:** identical `text` bodies are rare in real products; caching **normalized** text hashes could help **repeat** submits but adds **staleness** and **privacy** policy work.

---

### Summary table (API call strategy)

| Topic | This repo | If traffic and SLAs grow |
|-------|-----------|---------------------------|
| Calls per analyze | 1 | Consider tool use before adding more calls |
| Output contract | Parse text JSON | Prefer schema-enforced / tool output |
| Latency UX | Buffered JSON (simple parse, worse TTFB) | Streaming for earlier bytes / long-held requests; async job + webhook under heavy load |
| Errors to client | Generic 500 on provider failures | Structured client errors + rich server logs |
| Cost control | `max_tokens`, single call | Budgets, model routing, queues; monitor **billable function duration** during slow LLM I/O on Vercel |

## Vercel

Create a project from this repo, set **`ANTHROPIC_API_KEY`** and **`ANTHROPIC_MODEL`** in the project’s Environment Variables, and deploy. The analyze route uses **`export const runtime = "nodejs"`** so the Anthropic SDK runs on the Node serverless runtime.
