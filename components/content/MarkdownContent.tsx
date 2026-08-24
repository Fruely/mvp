import type { ReactNode } from "react";

const LINK_CLASS = "font-medium text-freuly-primary underline underline-offset-2";
const BARE_URL_PATTERN = /https?:\/\/[^\s<]+/gi;

function safeHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

function splitTrailingPunctuation(value: string): { href: string; trailing: string } {
  let href = value;
  let trailing = "";

  while (/[.,!?;:]$/.test(href)) {
    trailing = href.slice(-1) + trailing;
    href = href.slice(0, -1);
  }

  return { href, trailing };
}

function renderPlainText(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  BARE_URL_PATTERN.lastIndex = 0;

  while ((match = BARE_URL_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`${keyPrefix}-text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    const { href: rawHref, trailing } = splitTrailingPunctuation(match[0]);
    const href = safeHref(rawHref);

    if (href) {
      nodes.push(
        <a key={`${keyPrefix}-link-${match.index}`} href={href} className={LINK_CLASS}>
          {rawHref}
        </a>,
      );
    } else {
      nodes.push(<span key={`${keyPrefix}-url-${match.index}`}>{rawHref}</span>);
    }

    if (trailing) {
      nodes.push(<span key={`${keyPrefix}-trail-${match.index}`}>{trailing}</span>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={`${keyPrefix}-text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return nodes.length ? nodes : [<span key={`${keyPrefix}-text`}>{text}</span>];
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|==[^=]+==|\*[^*]+\*|\[[^\]]+\]\([^\)]+\))/g;
  const parts = text.split(tokenPattern).filter(Boolean);

  return parts.flatMap((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key} className="font-bold">{renderPlainText(part.slice(2, -2), `${key}-strong`)}</strong>;
    }

    if (part.startsWith("==") && part.endsWith("==")) {
      return (
        <strong key={key} className="font-semibold text-freuly-primary">
          {renderPlainText(part.slice(2, -2), `${key}-accent`)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key} className="italic">{renderPlainText(part.slice(1, -1), `${key}-italic`)}</em>;
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    if (linkMatch) {
      const href = safeHref(linkMatch[2]);
      if (!href) return <span key={key}>{linkMatch[1]}</span>;
      return (
        <a key={key} href={href} className={LINK_CLASS}>
          {linkMatch[1]}
        </a>
      );
    }

    return renderPlainText(part, key);
  });
}

export function MarkdownContent({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index];
    const line = raw.trim();

    if (!line) {
      index += 1;
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^\)]+)\)$/);
    if (imageMatch) {
      const src = safeHref(imageMatch[2]);
      if (src && /^https?:\/\//i.test(src)) {
        blocks.push(
          <figure key={`image-${index}`} className="my-8 overflow-hidden rounded-freuly-lg">
            <img src={src} alt={imageMatch[1]} className="h-auto w-full" loading="lazy" />
          </figure>,
        );
      }
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${index}`} className="mt-8 text-[20px] font-semibold text-freuly-text-primary">
          {renderInline(line.slice(4), `h3-${index}`)}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${index}`} className="mt-10 pt-3 text-[24px] font-bold text-freuly-text-primary">
          {renderInline(line.slice(3), `h2-${index}`)}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote key={`quote-${index}`} className="my-6 border-l-[3px] border-freuly-primary pl-5 text-[16px] leading-[1.7] text-freuly-text-secondary">
          {renderInline(line.slice(2), `quote-${index}`)}
        </blockquote>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        const item = lines[index].trim().replace(/^[-*]\s+/, "");
        items.push(<li key={`ul-${index}`}>{renderInline(item, `ul-${index}`)}</li>);
        index += 1;
      }
      blocks.push(
        <ul key={`ul-block-${index}`} className="my-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.7] text-freuly-text-primary marker:text-freuly-primary">
          {items}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        const item = lines[index].trim().replace(/^\d+\.\s+/, "");
        items.push(<li key={`ol-${index}`}>{renderInline(item, `ol-${index}`)}</li>);
        index += 1;
      }
      blocks.push(
        <ol key={`ol-block-${index}`} className="my-5 list-decimal space-y-2 pl-6 text-[16px] leading-[1.7] text-freuly-text-primary">
          {items}
        </ol>,
      );
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || /^(## |### |> |[-*]\s+|\d+\.\s+|!\[)/.test(next)) break;
      paragraphLines.push(next);
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="my-5 text-[16px] leading-[1.7] text-freuly-text-primary">
        {renderInline(paragraphLines.join(" "), `p-${index}`)}
      </p>,
    );
  }

  return <div className="flex flex-col gap-0">{blocks}</div>;
}
