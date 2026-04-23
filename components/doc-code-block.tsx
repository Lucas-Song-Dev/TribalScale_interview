"use client";

import { useCallback, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocCodeBlockProps = {
  /** For in-page anchor links / Ctrl+F targets */
  id: string;
  title: string;
  /** Short explanation shown under the title (searchable in-page). */
  lead?: string;
  code: string;
  className?: string;
};

export function DocCodeBlock({
  id,
  title,
  lead,
  code,
  className,
}: DocCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <section
      id={id}
      className={cn("scroll-mt-24 border-b border-border pb-10 last:border-0", className)}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2 pr-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {lead ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{lead}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 self-start sm:self-auto"
          onClick={() => void handleCopy()}
        >
          {copied ? "Copied" : "Copy block"}
        </Button>
      </div>
      <div
        className="max-h-[min(70vh,36rem)] overflow-auto rounded-lg border border-border bg-[#1e1e1e] p-1 shadow-inner"
        tabIndex={0}
      >
        <SyntaxHighlighter
          language="typescript"
          style={vscDarkPlus}
          showLineNumbers
          lineNumberStyle={{
            minWidth: "2.75rem",
            paddingRight: "1rem",
            color: "rgba(255,255,255,0.35)",
            userSelect: "none",
          }}
          customStyle={{
            margin: 0,
            padding: "0.75rem 1rem",
            fontSize: "0.8125rem",
            lineHeight: 1.55,
            borderRadius: "0.375rem",
            background: "#1e1e1e",
          }}
          codeTagProps={{
            className: "font-mono",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </section>
  );
}
