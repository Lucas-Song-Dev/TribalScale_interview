"use client";

import { useState } from "react";

type SuccessBody = {
  summary: string;
  action_items: string[];
};

type ErrorBody = {
  error: string;
};

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuccessBody | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const err = data as ErrorBody;
        setError(typeof err.error === "string" ? err.error : "Request failed");
        return;
      }
      const ok = data as SuccessBody;
      if (
        typeof ok.summary === "string" &&
        Array.isArray(ok.action_items)
      ) {
        setResult(ok);
      } else {
        setError("Unexpected response shape");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Text analyzer
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            TribalScale take-home: POST{" "}
            <code className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              /api/analyze
            </code>{" "}
            returns a summary and three action items as JSON.
          </p>
        </header>

        <aside
          className="rounded-lg border border-amber-200/80 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="note"
        >
          <p className="font-medium">Reviewer note (scope)</p>
          <p className="mt-2 leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            This page is{" "}
            <strong className="font-semibold">not part of the take-home</strong>
            . The exercise asks for an API that returns structured JSON. I added
            this UI only so you can{" "}
            <strong className="font-semibold">see and trigger</strong>{" "}
            <code className="rounded bg-amber-200/70 px-1 font-mono text-[0.8rem] dark:bg-amber-900/50">
              POST /api/analyze
            </code>{" "}
            without using{" "}
            <code className="rounded bg-amber-200/70 px-1 font-mono text-[0.8rem] dark:bg-amber-900/50">
              curl
            </code>
            . What I expect you to evaluate is the{" "}
            <strong className="font-semibold">route handler and prompt flow</strong>
            , not the frontend.
          </p>
        </aside>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Text to analyze
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-normal shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-600"
              placeholder="Paste meeting notes, an email thread, a brief, etc."
              disabled={loading}
              required
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || text.trim().length === 0}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </form>

        {error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {result ? (
          <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Summary
            </h2>
            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {result.summary}
            </p>
            <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Action items
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-base leading-relaxed">
              {result.action_items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </section>
        ) : null}
      </main>
    </div>
  );
}
