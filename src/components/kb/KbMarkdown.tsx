"use client";

import { useMemo, type ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HugeiconsIcon } from "@hugeicons/react";
import * as HugeIconsAll from "@hugeicons/core-free-icons";
import KbMarkdownHr from "@/src/components/kb/KbMarkdownHr";
import {
  getMarkdownTheme,
  getHrVariant,
  themeCssVars,
  type KbMarkdownThemeId,
  type KbMarkdownThemeTokens,
} from "@/src/lib/kb-markdown-themes";

function InlineMdIcon({ name, color }: { name: string; color: string }) {
  const key = `${name}Icon` as keyof typeof HugeIconsAll;
  const icon = (HugeIconsAll as Record<string, unknown>)[key];
  if (!icon) {
    return (
      <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-400 rounded px-1 font-mono text-xs">
        [{name}]
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 align-middle mx-0.5 relative top-[-1px]">
      <HugeiconsIcon icon={icon as never} size={16} color={color} />
    </span>
  );
}

function buildComponents(themeId: KbMarkdownThemeId, accent: string) {
  let hrIndex = 0;
  const theme = getMarkdownTheme(themeId);

  return {
    h1: (p: ComponentProps<"h1">) => <h1 className="kb-h1" {...p} />,
    h2: (p: ComponentProps<"h2">) => <h2 {...p} />,
    h3: (p: ComponentProps<"h3">) => <h3 {...p} />,
    h4: (p: ComponentProps<"h4">) => <h4 {...p} />,
    p: (p: ComponentProps<"p">) => <p {...p} />,
    strong: (p: ComponentProps<"strong">) => <strong {...p} />,
    em: (p: ComponentProps<"em">) => <em {...p} />,
    del: (p: ComponentProps<"del">) => <del {...p} />,
    code: ({ inline, children, ...p }: { inline?: boolean; children?: React.ReactNode }) => {
      const text = String(children).trim();
      if (inline && text.startsWith("icon:")) {
        return <InlineMdIcon name={text.slice(5)} color={accent} />;
      }
      return inline ? <code {...p}>{children}</code> : <code {...p}>{children}</code>;
    },
    pre: (p: ComponentProps<"pre">) => <pre {...p} />,
    blockquote: (p: ComponentProps<"blockquote">) => <blockquote {...p} />,
    ul: ({ className, ...p }: ComponentProps<"ul">) => (
      <ul className={[className, "kb-list"].filter(Boolean).join(" ")} {...p} />
    ),
    ol: ({ className, ...p }: ComponentProps<"ol">) => (
      <ol className={[className, "kb-list"].filter(Boolean).join(" ")} {...p} />
    ),
    li: (p: ComponentProps<"li">) => <li {...p} />,
    table: (p: ComponentProps<"table">) => (
      <div className="kb-table-wrap">
        <table {...p} />
      </div>
    ),
    thead: (p: ComponentProps<"thead">) => <thead {...p} />,
    tbody: (p: ComponentProps<"tbody">) => <tbody {...p} />,
    tr: (p: ComponentProps<"tr">) => <tr {...p} />,
    th: (p: ComponentProps<"th">) => <th {...p} />,
    td: (p: ComponentProps<"td">) => <td {...p} />,
    hr: () => {
      const variant = getHrVariant(theme, hrIndex++);
      return <KbMarkdownHr variant={variant} />;
    },
    a: ({ href, children, ...p }: ComponentProps<"a">) => (
      <a href={href} target="_blank" rel="noopener noreferrer" {...p}>
        {children}
      </a>
    ),
    img: ({ src, alt, ...p }: ComponentProps<"img">) => (
      <img src={src} alt={alt} {...p} />
    ),
  };
}

interface KbMarkdownProps {
  content: string;
  theme?: KbMarkdownThemeId | string | null;
  themeTokens?: KbMarkdownThemeTokens;
  className?: string;
}

export default function KbMarkdown({
  content,
  theme = "minimal",
  themeTokens,
  className = "",
}: KbMarkdownProps) {
  const resolved = themeTokens ?? getMarkdownTheme(theme);
  const components = useMemo(
    () => buildComponents(resolved.id, resolved.accent),
    [resolved.id, resolved.accent, content]
  );

  return (
    <div className={`kb-prose-sheet ${className}`.trim()}>
      <div
        className={[
          "kb-prose",
          `kb-prose--${resolved.id}`,
          `kb-quote--${resolved.quoteStyle}`,
          `kb-heading--${resolved.headingStyle}`,
        ].join(" ")}
        style={themeCssVars(resolved)}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
