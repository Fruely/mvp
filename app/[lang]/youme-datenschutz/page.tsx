import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { youmeDatenschutzSource } from "@/content/legal/youmeDatenschutzSource";
import { youmeDatenschutzBlocks } from "@/lib/legal/youmeDatenschutzBlocks.mjs";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";

export const metadata: Metadata = {
  title: "Datenschutzerklärung YouMe",
  description: "Datenschutzerklärung für die mobilen Apps YouMe auf Android und iOS.",
  alternates: { canonical: `${SITE_DOMAIN}/de/youme-datenschutz` },
};

function inline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /https:\/\/[^\s]+/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const href = match[0];
    nodes.push(
      <a key={`${keyPrefix}-${index}`} className="underline underline-offset-4" href={href}>
        {href}
      </a>
    );
    last = match.index + href.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function YouMeDatenschutzPage({ params }: { params: { lang: string } }) {
  if (params.lang !== "de") redirect("/de/youme-datenschutz");
  const blocks = youmeDatenschutzBlocks(youmeDatenschutzSource);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <div className="rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10">
        {blocks.map((block, index) => {
          if (block.type === "h1") {
            return (
              <h1 key={index} className="break-words text-3xl font-semibold tracking-tight md:text-4xl">
                {block.text}
              </h1>
            );
          }
          if (block.type === "h2") {
            return (
              <h2 key={index} className="mt-8 break-words text-lg font-semibold">
                {block.text}
              </h2>
            );
          }
          if (block.type === "ul") {
            const items = block.items ?? [];
            return (
              <ul key={index} className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                {items.map((item, itemIndex) => (
                  <li key={itemIndex}>{inline(item, `${index}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          }
          const lines = block.lines ?? [];
          return (
            <p key={index} className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {lines.map((line, lineIndex) => (
                <span key={lineIndex}>
                  {lineIndex > 0 ? <br /> : null}
                  {inline(line.text, `${index}-${lineIndex}`)}
                </span>
              ))}
            </p>
          );
        })}
      </div>
    </main>
  );
}
