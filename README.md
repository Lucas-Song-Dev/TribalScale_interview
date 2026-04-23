# Text analyzer (TribalScale take-home)

Next.js app that exposes **`POST /api/analyze`**: send a block of text, call **Anthropic Claude**, and receive a **short summary** plus **exactly three action items** as **structured JSON**. Includes an **optional reviewer UI** at `/` (out of scope for the original brief) and **Vitest** + **GitHub Actions** CI.

---

## Table of contents

1. [Overview](#overview)
2. [Repository layout](#repository-layout)
3. [Tech stack](#tech-stack)
4. [Environment variables](#environment-variables)
5. [Scripts](#scripts)
6. [Local development](#local-development)
7. [API](#api)
8. [Frontend](#frontend)
9. [Libraries and shared code](#libraries-and-shared-code)
10. [UI components](#ui-components)
11. [Testing](#testing)
12. [Continuous integration](#continuous-integration)
13. [Deployment (Vercel)](#deployment-vercel)
14. [Prompt design](#prompt-design)
15. [What broke first and how it was fixed](#what-broke-first-and-how-it-was-fixed)
16. [Future improvements](#future-improvements)
17. [API design tradeoffs and performance](#api-design-tradeoffs-and-performance)
18. [Links](#links)

---

## Overview

**Take-home goal:** one endpoint that accepts text, uses an LLM for a summary + three action items, returns JSON (or structured errors).

**This repository adds:**

- **Next.js App Router** app with a **Route Handler** for the API (no separate Express server).
- **Reviewer-facing UI** at `/` with a clear scope note, sample transcript, links to an example PR and the GitHub repo, analyze form with staged progress, **HTML / JSON** results (including **Copy JSON**), plus a dedicated **`/backend`** page of annotated code blocks for easy search and copy-paste.
- **Vitest** tests **co-located** next to the modules they cover (`*.test.ts` / `*.test.tsx`).
- **GitHub Actions** running **lint** and **tests** on every **push** and **pull request**.

The **graded deliverable** for the exercise is the **API behavior and prompt path**; the page is convenience tooling for reviewers.

---

## Repository layout

| Path | Purpose |
|------|---------|
| [`app/layout.tsx`](app/layout.tsx) | Root layout, **Inter** + **Geist Mono** fonts, metadata. |
| [`app/globals.css`](app/globals.css) | **Tailwind CSS v4** + **OKLCH** semantic tokens (`background`, `foreground`, `primary`, `muted`, `destructive`, `warning`, etc.). |
| [`app/page.tsx`](app/page.tsx) | Client home: analyze form, link to `/backend`, reviewer note, results (HTML/JSON toggle), sidebar cards. |
| [`app/page.test.tsx`](app/page.test.tsx) | Tests for the home page. |
| [`app/backend/page.tsx`](app/backend/page.tsx) | **Reviewer doc:** annotated `POST /api/analyze` walkthrough (anchors, copy per block). |
| [`app/backend/layout.tsx`](app/backend/layout.tsx) | Metadata for `/backend`. |
| [`app/backend/page.test.tsx`](app/backend/page.test.tsx) | Tests for the backend doc page. |
| [`app/api/analyze/route.ts`](app/api/analyze/route.ts) | `POST /api/analyze` — validation, Anthropic call, parse/validate response. |
| [`app/api/analyze/route.test.ts`](app/api/analyze/route.test.ts) | API route tests (mocked SDK). |
| [`components/ui/`](components/ui/) | shadcn-style primitives: `Button`, `Card`, `Label`, `Textarea`, `Badge` (CVA + Radix where needed). |
| [`components/analysis-progress.tsx`](components/analysis-progress.tsx) | Progress bar + stage label while the model runs (mount with `key` per run). |
| [`components/analysis-progress.test.tsx`](components/analysis-progress.test.tsx) | Tests for progress UI. |
| [`components/doc-code-block.tsx`](components/doc-code-block.tsx) | Client “doc” block: title, optional lead, monospace snippet, **Copy block**. |
| [`lib/utils.ts`](lib/utils.ts) | `cn()` — `clsx` + `tailwind-merge` for class composition. |
| [`lib/parse-model-response.ts`](lib/parse-model-response.ts) | Strip markdown fences, parse and validate `{ summary, action_items[3] }`. |
| [`lib/parse-model-response.test.ts`](lib/parse-model-response.test.ts) | Parser unit tests. |
| [`lib/sample-meeting-transcript.ts`](lib/sample-meeting-transcript.ts) | Constant sample meeting text for the “Load meeting example” control. |
| [`lib/backend-doc-sections.ts`](lib/backend-doc-sections.ts) | Section titles + annotated code strings for [`/backend`](app/backend/page.tsx). |
| [`vitest.config.ts`](vitest.config.ts) | Vitest + React plugin, `@/` alias, coverage include paths. |
| [`vitest.setup.ts`](vitest.setup.ts) | `@testing-library/jest-dom` + RTL `cleanup()` after each test. |
| [`eslint.config.mjs`](eslint.config.mjs) | ESLint (Next core-web-vitals + TypeScript); ignores `coverage/`, `.next/`, etc. |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI workflow (Node 22, `npm ci`, lint, tests). |
| [`.env.example`](.env.example) | Documented env vars (no secrets). |
| [`next.config.ts`](next.config.ts) | Next.js config (defaults). |
| [`postcss.config.mjs`](postcss.config.mjs) | PostCSS for Tailwind. |
| [`tsconfig.json`](tsconfig.json) | TypeScript; `paths`: `@/*` → project root. |

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | **Next.js 16** (App Router) |
| UI | **React 19**, **Tailwind CSS v4**, **class-variance-authority**, **Radix** (`@radix-ui/react-slot`, `@radix-ui/react-label`) |
| LLM | **Anthropic** via `@anthropic-ai/sdk` |
| Language | **TypeScript** |
| Tests | **Vitest 4**, **Testing Library**, **jsdom** |
| Lint | **ESLint 9** + `eslint-config-next` |

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env` (`.env` is gitignored).

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for `POST /api/analyze`. |
| `ANTHROPIC_MODEL` | Yes | Model id passed to `messages.create` (e.g. your org’s default). |
| `MAX_TEXT_LENGTH` | No | Max characters for `text` after trim (default **10000**). Read per request in the route handler. |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Run production server (after `build`). |
| `npm run lint` | ESLint. |
| `npm run test` | Vitest watch mode. |
| `npm run test:run` | Vitest single run (CI-style). |
| `npm run test:coverage` | Vitest with V8 coverage (see [Testing](#testing) for scope). |

---

## Local development

```bash
npm install
cp .env.example .env   # then set ANTHROPIC_API_KEY and ANTHROPIC_MODEL
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Backend walkthrough: [http://localhost:3000/backend](http://localhost:3000/backend)
- API: `POST http://localhost:3000/api/analyze`

**Windows CMD** (example `curl` uses `\` continuations; use `^` or a single line on Windows):

```bash
curl -s -X POST http://localhost:3000/api/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"We agreed to ship the MVP by Friday. Alice will own the API contract. Bob will write the release notes.\"}"
```

---

## API

### `POST /api/analyze`

**Request:** `Content-Type: application/json`

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

**Validation (400):** missing or wrong-typed `text`, empty string after trim, text longer than `getMaxTextLength()` (from `MAX_TEXT_LENGTH` or default 10_000).

**Server / model (500):** missing `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`, Anthropic request failure (generic message to client), unparseable model output, or shape that fails strict validation (exactly three non-empty string action items + non-empty summary).

**Runtime:** [`app/api/analyze/route.ts`](app/api/analyze/route.ts) sets `export const runtime = "nodejs"` for the Anthropic SDK.

---

## Frontend

**Routes**

- **`/`** — [`app/page.tsx`](app/page.tsx) (client).
- **`/backend`** — [`app/backend/page.tsx`](app/backend/page.tsx) (server): annotated implementation for reviewers.

**Main column (`/`)**

- Title and short description of the take-home / endpoint, with an inline link to **`/backend`**.
- **Backend implementation** card (left column, same style as sidebar cards): explains the walkthrough page and links **Open annotated backend walkthrough**.
- **Reviewer note** (`role="note"`): scope, no scope creep, UI as time-saver vs `curl`; grade route + prompts + validation.
- **Analyze** card: labeled textarea, **Analyze** submit, optional **Analysis progress** (stage + % bar) while loading.
- **Error** alert for API/network failures.
- **Results** card (after success): top-right **HTML | JSON** toggle; **HTML** shows summary + ordered action items; **JSON** shows pretty-printed response and **Copy JSON** (clipboard).

**Right sidebar** (sticky on large screens)

1. **Try an example** — loads [`lib/sample-meeting-transcript.ts`](lib/sample-meeting-transcript.ts) into the textarea.
2. **Example: GitHub repo setup** — copy + link to [example PR #1](https://github.com/Lucas-Song-Dev/TribalScale_interview/pull/1) (CI, branch protection, etc.).
3. **Source repository** — button link to the [GitHub repo](https://github.com/Lucas-Song-Dev/TribalScale_interview).

**`/backend` layout**

- **Left column:** “How to use this page” (search, anchors, copy) + **On this page** nav with hash links to each section.
- **Right column:** ordered sections from [`lib/backend-doc-sections.ts`](lib/backend-doc-sections.ts), each with **Copy block** (clipboard) for that snippet only.

Styling follows a **shadcn-like** pattern: semantic Tailwind tokens from [`app/globals.css`](app/globals.css), composed primitives under [`components/ui/`](components/ui/), and `cn()` from [`lib/utils.ts`](lib/utils.ts).

---

## Libraries and shared code

| Module | Role |
|--------|------|
| [`lib/parse-model-response.ts`](lib/parse-model-response.ts) | `stripMarkdownFences`, `parseAnalyzePayload` — strict JSON shape after model text. |
| [`lib/utils.ts`](lib/utils.ts) | `cn()` for Tailwind class merging. |
| [`lib/sample-meeting-transcript.ts`](lib/sample-meeting-transcript.ts) | Exported string used by the sample loader button. |
| [`lib/backend-doc-sections.ts`](lib/backend-doc-sections.ts) | Data for `/backend` (keep in sync with route + parser when they change). |

---

## UI components

| Component | Notes |
|-----------|--------|
| [`components/ui/button.tsx`](components/ui/button.tsx) | CVA variants (`default`, `outline`, `ghost`, …); `asChild` via Radix Slot. |
| [`components/ui/card.tsx`](components/ui/card.tsx) | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`. |
| [`components/ui/label.tsx`](components/ui/label.tsx) | Radix Label + CVA. |
| [`components/ui/textarea.tsx`](components/ui/textarea.tsx) | Styled textarea. |
| [`components/ui/badge.tsx`](components/ui/badge.tsx) | CVA variants. |
| [`components/analysis-progress.tsx`](components/analysis-progress.tsx) | Timer-based % bar + stage badge; mount only while loading with a changing `key` from the page. |

---

## Testing

**Run:** `npm run test` (watch) or `npm run test:run` (once).

**Co-location:** tests live **next to** the source file with the **same basename** + `.test` + extension:

| Source | Test |
|--------|------|
| [`app/api/analyze/route.ts`](app/api/analyze/route.ts) | [`app/api/analyze/route.test.ts`](app/api/analyze/route.test.ts) |
| [`lib/parse-model-response.ts`](lib/parse-model-response.ts) | [`lib/parse-model-response.test.ts`](lib/parse-model-response.test.ts) |
| [`app/page.tsx`](app/page.tsx) | [`app/page.test.tsx`](app/page.test.tsx) |
| [`app/backend/page.tsx`](app/backend/page.tsx) | [`app/backend/page.test.tsx`](app/backend/page.test.tsx) |
| [`components/analysis-progress.tsx`](components/analysis-progress.tsx) | [`components/analysis-progress.test.tsx`](components/analysis-progress.test.tsx) |

**Coverage** (`npm run test:coverage`): configured in [`vitest.config.ts`](vitest.config.ts) to include **`app/**/*.ts`** and **`lib/**/*.ts`** (route + parsers; not `*.tsx` UI files by default). HTML report under `coverage/`.

**Clipboard in tests:** for **Copy JSON**, tests mock `navigator.clipboard` **after** `userEvent.setup()` so Testing Library’s clipboard stub is not overwritten.

---

## Continuous integration

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

- **Triggers:** every **`pull_request`**, and every **`push`** to any branch (including the first push on a new branch).
- **Runner:** `ubuntu-latest`, **Node 22**, `npm ci`, **`npm run lint`**, **`npm run test:run`**.
- **Concurrency:** `cancel-in-progress: true` per ref to avoid stacking duplicate runs.

---

## Deployment (Vercel)

1. Import the GitHub repository into Vercel.
2. Set **`ANTHROPIC_API_KEY`** and **`ANTHROPIC_MODEL`** in the project’s environment variables (and optional **`MAX_TEXT_LENGTH`**).
3. Deploy. Keep the analyze route on the **Node.js** runtime (`runtime = "nodejs"` in the route file).

---

## Prompt design

**System message** (intent):

```text
Analyze the following text and respond with ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence summary",
  "action_items": ["item 1", "item 2", "item 3"]
}

Do not include any explanation, markdown formatting, or code fences.
```

**User message:** `Text:\n{user text}` — instructions stay in `system`, document in `user`.

---

## What broke first and how it was fixed

- **Fenced JSON** despite “no fences” → [`stripMarkdownFences`](lib/parse-model-response.ts) before `JSON.parse`.
- **Loose parsing** → strict validation: non-empty `summary`, **exactly three** non-empty string `action_items`, else **500** with a stable message.

---

## Future improvements

- **Anthropic tool use / structured outputs** for schema-bound responses.
- **One retry** on parse failure with a stricter JSON-only reminder.
- **Prompt-injection** hardening, **rate limiting**, richer **server-side** logging for 500s.
- **Contract / E2E** tests against a deployed preview or recorded fixtures.
- **Expand coverage** includes to `app/**/*.tsx` / `components/**` if you want UI metrics in CI.

---

## API design tradeoffs and performance

This section is about **how and when** the handler talks to Anthropic, what was traded off, and what happens if traffic grows. Implementation: [`app/api/analyze/route.ts`](app/api/analyze/route.ts), [`lib/parse-model-response.ts`](lib/parse-model-response.ts).

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
const parsed = parseAnalyzePayload(rawAssistant);
if (!parsed.ok) {
  return jsonError(parsed.reason, 500);
}
```

Fence stripping (models still sometimes wrap JSON):

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

---

## Links

- **Repository:** [github.com/Lucas-Song-Dev/TribalScale_interview](https://github.com/Lucas-Song-Dev/TribalScale_interview)
- **Example PR (CI + branch protection):** [Pull request #1](https://github.com/Lucas-Song-Dev/TribalScale_interview/pull/1)
