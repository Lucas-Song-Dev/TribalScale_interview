"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AnalysisProgress } from "@/components/analysis-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_MEETING_TRANSCRIPT } from "@/lib/sample-meeting-transcript";
import { cn } from "@/lib/utils";

const EXAMPLE_REPO_SETUP_PR =
  "https://github.com/Lucas-Song-Dev/TribalScale_interview/pull/1";
const SOURCE_REPO_URL =
  "https://github.com/Lucas-Song-Dev/TribalScale_interview";

type SuccessBody = {
  summary: string;
  action_items: string[];
};

type ErrorBody = {
  error: string;
};

type ResultView = "html" | "json";

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressRunId, setProgressRunId] = useState(0);
  const [result, setResult] = useState<SuccessBody | null>(null);
  const [resultView, setResultView] = useState<ResultView>("html");
  const [jsonCopied, setJsonCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyResultJson = useCallback(async () => {
    if (!result) return;
    const payload = JSON.stringify(result, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setJsonCopied(true);
      window.setTimeout(() => setJsonCopied(false), 2000);
    } catch {
      setJsonCopied(false);
    }
  }, [result]);

  function loadSampleTranscript() {
    setText(SAMPLE_MEETING_TRANSCRIPT);
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProgressRunId((id) => id + 1);
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
        setResultView("html");
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
    <div className="min-h-full flex-1 bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="flex flex-col gap-8">
            <header className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Text analyzer
              </h1>
              <p className="text-sm text-muted-foreground">
                TribalScale take-home: POST{" "}
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
                  /api/analyze
                </code>{" "}
                returns a summary and three action items as JSON. For a
                line-by-line walkthrough with copy-friendly snippets.
              </p>
            </header>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Backend implementation</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  The graded work is the API and parsing logic. The{" "}
                  <strong className="font-medium text-foreground">
                    backend reference
                  </strong>{" "}
                  collects the same flow as in the repo—comments, anchors for search,
                  and a <strong className="font-medium text-foreground">Copy block</strong>{" "}
                  button on each snippet so you can paste excerpts into a review
                  without hunting through files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                >
                  <Link href="/backend">Open annotated backend walkthrough</Link>
                </Button>
              </CardContent>
            </Card>

            <aside
              className="rounded-lg border border-warning-border bg-warning p-4 text-sm text-warning-foreground"
              role="note"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">For reviewers</p>
                <Badge variant="outline" className="text-xs">
                  Optional UI
                </Badge>
              </div>
              <p className="mt-3 leading-relaxed">
                I care about honoring the brief and avoiding{" "}
                <strong className="font-semibold">scope creep</strong>—the
                take-home is the API that returns structured JSON (
                <code className="rounded-md bg-background/60 px-1 font-mono text-[0.8rem]">
                  POST /api/analyze
                </code>
                ), not a polished frontend.
              </p>
              <p className="mt-3 leading-relaxed">
                I added this lightweight page anyway so you could{" "}
                <strong className="font-semibold">save time</strong> and try the
                endpoint in a browser without reaching for{" "}
                <code className="rounded-md bg-background/60 px-1 font-mono text-[0.8rem]">
                  curl
                </code>
                , with results visible next to your text. When you review, please
                focus on the{" "}
                <strong className="font-semibold">
                  route handler, prompts, and validation
                </strong>
                —and treat the UI as optional convenience, not part of the graded
                deliverable.
              </p>
            </aside>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analyze text</CardTitle>
                <CardDescription>
                  Paste notes, a transcript, or any block of text below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="analyze-text">Text to analyze</Label>
                    <Textarea
                      id="analyze-text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={14}
                      placeholder="Paste meeting notes, an email thread, a brief, etc."
                      disabled={loading}
                      required
                      className="min-h-[200px] font-sans"
                    />
                  </div>
                  {loading ? (
                    <AnalysisProgress
                      key={progressRunId}
                      stageLabel="Model"
                      className="rounded-md border border-border bg-muted/30 p-3"
                    />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      disabled={loading || text.trim().length === 0}
                    >
                      {loading ? "Analyzing…" : "Analyze"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {error ? (
              <div
                className={cn(
                  "rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                )}
                role="alert"
              >
                {error}
              </div>
            ) : null}

            {result ? (
              <Card>
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5 pr-2">
                      <CardTitle className="text-lg">Results</CardTitle>
                      <CardDescription>
                        Summary and three action items from the model.
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                      <div
                        className="inline-flex rounded-md border border-input bg-muted/40 p-0.5"
                        role="group"
                        aria-label="Result display format"
                      >
                        <Button
                          type="button"
                          variant={resultView === "html" ? "secondary" : "ghost"}
                          size="sm"
                          className="h-8 rounded-sm px-3"
                          aria-pressed={resultView === "html"}
                          onClick={() => setResultView("html")}
                        >
                          HTML
                        </Button>
                        <Button
                          type="button"
                          variant={resultView === "json" ? "secondary" : "ghost"}
                          size="sm"
                          className="h-8 rounded-sm px-3"
                          aria-pressed={resultView === "json"}
                          onClick={() => setResultView("json")}
                        >
                          JSON
                        </Button>
                      </div>
                      {resultView === "json" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => void copyResultJson()}
                        >
                          {jsonCopied ? "Copied" : "Copy JSON"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {resultView === "html" ? (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Summary
                        </h2>
                        <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">
                          {result.summary}
                        </p>
                      </div>
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Action items
                        </h2>
                        <ol className="mt-2 list-decimal space-y-2 pl-5 text-base leading-relaxed">
                          {result.action_items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <pre
                      className="max-h-[min(70vh,32rem)] overflow-auto rounded-md border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm"
                      tabIndex={0}
                    >
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Try an example</CardTitle>
                <CardDescription>
                  Loads a realistic stand-up transcript into the text box so you
                  can run the API without pasting manually.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  PM + eng + design: API rollout blockers, staging demo, client
                  scope summary.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={loadSampleTranscript}
                  disabled={loading}
                >
                  Load meeting example
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Example: GitHub repo setup
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  This{" "}
                  <a
                    href={EXAMPLE_REPO_SETUP_PR}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline decoration-muted-foreground underline-offset-2 hover:decoration-foreground"
                  >
                    example pull request (#1)
                  </a>{" "}
                  shows how this repository is wired for automated testing, CI on
                  branches, and branch protection so changes are reviewed before
                  they land on the default branch.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a
                    href={EXAMPLE_REPO_SETUP_PR}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open example PR on GitHub
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source repository</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Full project code, tests, and CI configuration live in the
                  GitHub repo—browse files, history, and workflow definitions
                  there.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a
                    href={SOURCE_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open repository on GitHub
                  </a>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
