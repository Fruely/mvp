import type { LegalBlock, LegalDocument } from "@/content/legal/types";

function BlockView({ block }: { block: LegalBlock }) {
  if (block.type === "p") {
    return (
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {block.text}
      </p>
    );
  }

  if (block.type === "ul") {
    return (
      <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "labeledLinks") {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        {block.lines.map((line, index) => (
          <span key={`${line.label}-${line.value}`}>
            {index > 0 ? <br /> : null}
            {line.label}{" "}
            <a
              className="underline underline-offset-4 hover:opacity-80"
              href={line.href}
            >
              {line.value}
            </a>
          </span>
        ))}
      </p>
    );
  }

  return (
    <a
      className="text-sm underline underline-offset-4 hover:opacity-80"
      href={block.href}
      {...(block.external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {block.label}
    </a>
  );
}

export default function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <div className="rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10">
        <h1 className="break-words text-3xl font-semibold tracking-tight md:text-4xl">
          {document.title}
        </h1>
        {document.subtitle ? (
          <p className="mt-3 text-sm text-muted-foreground">{document.subtitle}</p>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">{document.stand}</p>
        {document.translationNotice ? (
          <p
            className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950/90"
            role="note"
          >
            {document.translationNotice}
          </p>
        ) : null}

        {document.sections.map((section) => (
          <section key={section.title} className="mt-8 space-y-3">
            <h2 className="break-words text-lg font-semibold">{section.title}</h2>
            {section.blocks.map((block, index) => (
              <BlockView key={`${section.title}-${index}`} block={block} />
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
