import Link from "next/link";
import { DocCodeBlock } from "@/components/doc-code-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BACKEND_DOC_SECTIONS } from "@/lib/backend-doc-sections";

export default function BackendDocsPage() {
  return (
    <div className="min-h-full flex-1 bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-9 px-2">
            <Link href="/">← Back to analyzer</Link>
          </Button>
        </div>

        <header className="mb-10 max-w-3xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Backend: <code className="font-mono text-2xl">POST /api/analyze</code>
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This page mirrors the implementation in{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
              app/api/analyze/route.ts
            </code>{" "}
            and{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">
              lib/parse-model-response.ts
            </code>
            . Each section has an anchor (<strong className="text-foreground">#id</strong>
            ) for search and deep links, and{" "}
            <strong className="text-foreground">Copy block</strong> grabs that
            snippet for your notes or PR comments.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,260px)_1fr] lg:items-start">
          <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How to use this page</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Use your browser search (<strong className="text-foreground">Ctrl+F</strong>{" "}
                  / <strong className="text-foreground">⌘F</strong>) on headings or
                  keywords like &quot;jsonError&quot;, &quot;parseAnalyzePayload&quot;,
                  or &quot;max_tokens&quot;. Jump quickly via{" "}
                  <strong className="text-foreground">On this page</strong> on the
                  left. Each code block is self-contained so{" "}
                  <strong className="text-foreground">Copy block</strong> pastes cleanly
                  into Slack, GitHub, or a doc.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">On this page</CardTitle>
                <CardDescription className="text-xs">
                  Anchor links (same tab).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <nav aria-label="Backend documentation sections">
                  <ol className="space-y-2 text-sm">
                    {BACKEND_DOC_SECTIONS.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="text-primary underline decoration-muted-foreground underline-offset-2 hover:decoration-foreground"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </CardContent>
            </Card>
          </aside>

          <div className="min-w-0 space-y-2">
            {BACKEND_DOC_SECTIONS.map((s) => (
              <DocCodeBlock
                key={s.id}
                id={s.id}
                title={s.title}
                lead={s.summary}
                code={s.code}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
