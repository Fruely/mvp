import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum | Freuly",
  description: "Impressum – Anbieterkennzeichnung für freuly.de",
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
          Angaben gemäß § 5 DDG
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Anbieter</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Freuly</span>
            <br />
            https://freuly.de
            <br />
            Plattform zur Darstellung von Spezialistenprofilen und zur
            Weiterleitung von Kontaktanfragen zwischen Nutzern und Spezialisten.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Verantwortlich für den Inhalt</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Natalia Sheshenia</span>
            <br />
            Hofolpe Str. 46
            <br />
            57399 Kirchhundem
            <br />
            Deutschland
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Kontakt</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
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

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">
            Verantwortlich für journalistisch-redaktionelle Inhalte nach § 18 Abs.
            2 MStV
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Natalia Sheshenia</span>
            <br />
            Hofolpe Str. 46
            <br />
            57399 Kirchhundem
            <br />
            Deutschland
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Haftung für Inhalte</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Die eigenen Inhalte dieser Website wurden mit größter Sorgfalt
            erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität können
            wir jedoch keine Gewähr übernehmen.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Freuly stellt eine Plattform bereit, auf der Spezialisten eigene
            Profile, Leistungen, Preise, Fotos, Portfolio-Inhalte und weitere
            Angaben veröffentlichen können. Für Inhalte, Angaben, Bilder,
            Leistungsbeschreibungen und Angebote, die von Spezialisten selbst
            eingestellt werden, ist der jeweilige Spezialist verantwortlich.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Freuly vermittelt keine Dienstleistungsverträge, garantiert keine
            Aufträge, Zahlungen, Bewertungen oder eine bestimmte Qualität der
            angebotenen Leistungen. Verträge oder Absprachen kommen ausschließlich
            zwischen anfragenden Nutzern und dem jeweiligen Spezialisten zustande.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Haftung für Links</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Unsere Website kann Links zu externen Websites Dritter enthalten, auf
            deren Inhalte wir keinen Einfluss haben. Deshalb übernehmen wir für
            diese fremden Inhalte keine Gewähr. Für die Inhalte der verlinkten
            Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Urheberrecht</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Die auf dieser Website veröffentlichten eigenen Inhalte, Texte,
            Bilder und Werke unterliegen dem deutschen Urheberrecht. Inhalte, die
            von Spezialisten hochgeladen oder veröffentlicht werden, liegen in der
            Verantwortung der jeweiligen Spezialisten. Jede Art der Verwertung
            außerhalb der Grenzen des Urheberrechts bedarf der vorherigen
            Zustimmung des jeweiligen Rechteinhabers.
          </p>
        </section>

        <p className="mt-8 text-sm text-muted-foreground">Stand: Mai 2026</p>
      </div>
    </main>
  );
}
