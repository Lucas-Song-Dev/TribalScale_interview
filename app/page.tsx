"use client";

import { useState } from "react";
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
  const [progressRunId, setProgressRunId] = useState(0);
  const [result, setResult] = useState<SuccessBody | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                returns a summary and three action items as JSON.
              </p>
            </header>

            <aside
              className="rounded-lg border border-warning-border bg-warning p-4 text-sm text-warning-foreground"
              role="note"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">Reviewer note (scope)</p>
                <Badge variant="outline" className="text-xs">
                  Not graded
                </Badge>
              </div>
              <p className="mt-2 leading-relaxed">
                This page is{" "}
                <strong className="font-semibold">not part of the take-home</strong>
                . The exercise asks for an API that returns structured JSON. I
                added this UI only so you can{" "}
                <strong className="font-semibold">see and trigger</strong>{" "}
                <code className="rounded-md bg-background/60 px-1 font-mono text-[0.8rem]">
                  POST /api/analyze
                </code>{" "}
                without using{" "}
                <code className="rounded-md bg-background/60 px-1 font-mono text-[0.8rem]">
                  curl
                </code>
                . What I expect you to evaluate is the{" "}
                <strong className="font-semibold">
                  route handler and prompt flow
                </strong>
                , not the frontend.
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
                <CardHeader>
                  <CardTitle className="text-lg">Results</CardTitle>
                  <CardDescription>
                    Summary and three action items from the model.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                </CardContent>
              </Card>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
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
          </aside>
        </div>
      </div>
    </div>
  );
}
