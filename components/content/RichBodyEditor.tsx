"use client";

import { useRef, useCallback, useEffect } from "react";

const TOOLBAR_BTN =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-freuly-border-default bg-white px-2 text-[13px] font-semibold text-freuly-text-primary hover:border-freuly-primary hover:text-freuly-primary focus:outline-none focus:ring-1 focus:ring-freuly-primary";

// --- Markdown → HTML (for editing) ---

function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const htmlBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      htmlBlocks.push(`<h3>${inlineToHtml(line.slice(4))}</h3>`);
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      htmlBlocks.push(`<h2>${inlineToHtml(line.slice(3))}</h2>`);
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      htmlBlocks.push(`<blockquote>${inlineToHtml(line.slice(2))}</blockquote>`);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineToHtml(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      htmlBlocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineToHtml(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      htmlBlocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraphLines = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || /^(## |### |> |[-*]\s+|\d+\.\s+|!\[)/.test(next)) break;
      paragraphLines.push(next);
      i++;
    }
    htmlBlocks.push(`<p>${inlineToHtml(paragraphLines.join(" "))}</p>`);
  }

  return htmlBlocks.join("") || "<p><br></p>";
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineToHtml(text: string): string {
  const tokenPattern = /(\*\*[^*]+\*\*|==[^=]+==|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(tokenPattern).filter(Boolean);

  return parts
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
      if (part.startsWith("==") && part.endsWith("=="))
        return `<mark>${escapeHtml(part.slice(2, -2))}</mark>`;
      if (part.startsWith("*") && part.endsWith("*"))
        return `<em>${escapeHtml(part.slice(1, -1))}</em>`;
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const href = linkMatch[2].trim();
        if (/^(https?:\/\/|\/)/i.test(href))
          return `<a href="${escapeHtml(href)}">${escapeHtml(linkMatch[1])}</a>`;
        return escapeHtml(linkMatch[1]);
      }
      return escapeHtml(part);
    })
    .join("");
}

// --- HTML → Markdown (for storage) ---

function htmlToMarkdown(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return nodeChildrenToMd(div).trim();
}

function nodeChildrenToMd(parent: Node): string {
  const parts: string[] = [];
  parent.childNodes.forEach((node) => {
    parts.push(nodeToMd(node));
  });
  return parts.join("");
}

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = nodeChildrenToMd(el);

  switch (tag) {
    case "strong":
    case "b":
      return `**${inner}**`;
    case "em":
    case "i":
      return `*${inner}*`;
    case "mark":
      return `==${inner}==`;
    case "a": {
      const href = el.getAttribute("href") ?? "";
      if (!href || /^javascript:/i.test(href)) return inner;
      return `[${inner}](${href})`;
    }
    case "p":
    case "div":
      return inner.trim() ? `${inner}\n\n` : "\n\n";
    case "br":
      return "\n";
    case "h2":
      return `## ${inner}\n\n`;
    case "h3":
      return `### ${inner}\n\n`;
    case "blockquote":
      return `> ${inner}\n\n`;
    case "ul":
      return (
        Array.from(el.children)
          .map((li) => `- ${nodeChildrenToMd(li).trim()}`)
          .join("\n") + "\n\n"
      );
    case "ol":
      return (
        Array.from(el.children)
          .map((li, idx) => `${idx + 1}. ${nodeChildrenToMd(li).trim()}`)
          .join("\n") + "\n\n"
      );
    case "li":
      return inner;
    case "span":
      return inner;
    default:
      return inner;
  }
}

// --- Editor Component ---

type RichBodyEditorProps = {
  name: string;
  value: string;
  onChange: (markdown: string) => void;
};

export default function RichBodyEditor({ name, value, onChange }: RichBodyEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
      initializedRef.current = true;
    }
  }, [value]);

  const syncMarkdown = useCallback(() => {
    if (!editorRef.current) return;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    onChange(md);
  }, [onChange]);

  const execFormat = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncMarkdown();
  }, [syncMarkdown]);

  const handleBold = useCallback(() => execFormat("bold"), [execFormat]);
  const handleItalic = useCallback(() => execFormat("italic"), [execFormat]);

  const handleAccent = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const parent = range.commonAncestorContainer.parentElement;

    if (parent?.tagName === "MARK") {
      const text = document.createTextNode(parent.textContent ?? "");
      parent.replaceWith(text);
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(text);
      selection.addRange(newRange);
    } else {
      const mark = document.createElement("mark");
      range.surroundContents(mark);
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(mark);
      selection.addRange(newRange);
    }
    syncMarkdown();
  }, [syncMarkdown]);

  const handleLink = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString();
    const url = window.prompt("Введите ссылку (https://...)", "https://");
    if (!url || !/^(https?:\/\/|\/)/i.test(url.trim())) return;

    const safeUrl = url.trim();
    if (/^javascript:/i.test(safeUrl)) return;

    if (text) {
      const a = document.createElement("a");
      a.href = safeUrl;
      a.textContent = text;
      range.deleteContents();
      range.insertNode(a);
    } else {
      const a = document.createElement("a");
      a.href = safeUrl;
      a.textContent = safeUrl;
      range.insertNode(a);
    }
    syncMarkdown();
  }, [syncMarkdown]);

  return (
    <div>
      <textarea name={name} value={value} readOnly hidden aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-2 rounded-t-freuly-button border border-b-0 border-freuly-border-default bg-[#fafafa] px-3 py-2">
        <button type="button" onClick={handleBold} className={TOOLBAR_BTN} title="Жирный" aria-label="Жирный">
          <strong>B</strong>
        </button>
        <button type="button" onClick={handleItalic} className={`${TOOLBAR_BTN} italic`} title="Курсив" aria-label="Курсив">
          I
        </button>
        <button type="button" onClick={handleAccent} className={`${TOOLBAR_BTN} text-freuly-primary`} title="Фирменный акцент" aria-label="Фирменный акцент">
          Акцент
        </button>
        <button type="button" onClick={handleLink} className={TOOLBAR_BTN} title="Добавить ссылку" aria-label="Добавить ссылку">
          Ссылка
        </button>
        <span className="ml-1 text-[12px] font-normal text-freuly-text-secondary">
          Выделите текст → нажмите формат
        </span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncMarkdown}
        onBlur={syncMarkdown}
        className="min-h-[320px] w-full rounded-b-freuly-button border border-freuly-border-default bg-white p-4 text-[15px] leading-[1.7] text-freuly-text-primary focus:border-freuly-primary focus:outline-none focus:ring-1 focus:ring-freuly-primary [&_a]:font-medium [&_a]:text-freuly-primary [&_a]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-[3px] [&_blockquote]:border-freuly-primary [&_blockquote]:pl-4 [&_blockquote]:text-freuly-text-secondary [&_h2]:mt-6 [&_h2]:text-[20px] [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-[17px] [&_h3]:font-semibold [&_li]:ml-5 [&_mark]:rounded-sm [&_mark]:bg-freuly-primary-light [&_mark]:px-0.5 [&_mark]:font-semibold [&_mark]:text-freuly-primary [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-4"
        data-placeholder="Начните писать статью..."
      />
      <style>{`[data-placeholder]:empty:before { content: attr(data-placeholder); color: #9b9b9b; pointer-events: none; }`}</style>
    </div>
  );
}
