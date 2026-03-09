"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const trimmed = content.trim();

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${className ?? ""}`}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-sm">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="text-[11px] font-mono bg-muted px-1 py-0.5 rounded">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs mb-2 last:mb-0">
              {children}
            </pre>
          ),
          h1: ({ children }) => (
            <h3 className="text-sm font-semibold mb-1">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="text-sm font-semibold mb-1">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-xs font-semibold mb-1">{children}</h4>
          ),
        }}
      >
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
