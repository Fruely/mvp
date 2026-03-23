import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum | Freuly",
  description: "Impressum – Angaben gemäß § 5 TMG für freuly.de",
  alternates: {
    canonical: "https://freuly.de/impressum",
  },
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <div className="rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Impressum
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Angaben gemäß § 5 TMG
        </p>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Anbieter</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Natalia Sheshenia</span>
            <br />
            Hofolper Str. 46
            <br />
            57399 Kirchhundem
            <br />
            Deutschland
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Kontakt</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            E-Mail:{" "}
            <a
              className="underline underline-offset-4 hover:opacity-80"
              href="mailto:freuly.de@gmail.com"
            >
              freuly.de@gmail.com
            </a>
            <br />
            Telefon:{" "}
            <a
              className="underline underline-offset-4 hover:opacity-80"
              href="tel:+4916092686432"
            >
              0160 92686432
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Natalia Sheshenia</span>
            <br />
            Hofolper Str. 46
            <br />
            57399 Kirchhundem
            <br />
            Deutschland
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Haftung für Inhalte</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die
            Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch
            keine Gewähr übernehmen.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Haftung für Links</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
            wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch
            keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
            jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>
        </section>
      </div>
    </main>
  );
}