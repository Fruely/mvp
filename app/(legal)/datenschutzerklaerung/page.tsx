import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | Freuly",
  description: "Datenschutzerklärung – Informationen zum Umgang mit personenbezogenen Daten auf freuly.de",
  alternates: {
    canonical: "https://freuly.de/datenschutzerklaerung",
  },
};

export default function DatenschutzPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <div className="rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur md:p-10">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Datenschutzerklärung
        </h1>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">1. Datenschutz auf einen Blick</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
            personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">2. Verantwortlicher</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            <br />
            <span className="font-medium text-foreground">Natalia Sheshenia</span>
            <br />
            Hofolper Str. 46
            <br />
            57399 Kirchhundem
            <br />
            Deutschland
            <br />
            E-Mail:{" "}
            <a
              className="underline underline-offset-4 hover:opacity-80"
              href="mailto:freuly.de@gmail.com"
            >
              freuly.de@gmail.com
            </a>
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">
            3. Erhebung und Speicherung personenbezogener Daten
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Beim Besuch dieser Website werden automatisch Informationen erfasst, die Ihr
            Browser übermittelt. Dies sind insbesondere:
          </p>
          <ul className="ml-5 list-disc text-sm text-muted-foreground space-y-1">
            <li>IP-Adresse</li>
            <li>Datum und Uhrzeit der Anfrage</li>
            <li>Browsertyp und Browserversion</li>
            <li>verwendetes Betriebssystem</li>
            <li>Referrer URL</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Diese Daten dienen ausschließlich der technischen Bereitstellung der Website
            und werden nicht mit anderen Datenquellen zusammengeführt.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">4. Kontaktaufnahme</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wenn Sie uns per E-Mail oder über ein Formular kontaktieren, werden Ihre
            Angaben zur Bearbeitung der Anfrage gespeichert. Diese Daten geben wir nicht
            ohne Ihre Einwilligung weiter.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">5. Verwendung von Google Forms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Für die Erfassung von Anmeldungen und Informationen nutzen wir Google Forms
            (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland).
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die eingegebenen Daten werden auf Servern von Google gespeichert. Weitere
            Informationen finden Sie in der Datenschutzerklärung von Google:
          </p>
          <a
            className="underline underline-offset-4 hover:opacity-80 text-sm"
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://policies.google.com/privacy
          </a>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">6. Speicherdauer</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ihre personenbezogenen Daten verbleiben bei uns, bis der Zweck der
            Verarbeitung entfällt oder Sie die Löschung verlangen, sofern keine
            gesetzlichen Aufbewahrungspflichten entgegenstehen.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">7. Ihre Rechte</h2>
          <ul className="ml-5 list-disc text-sm text-muted-foreground space-y-1">
            <li>Auskunft über Ihre gespeicherten Daten</li>
            <li>Berichtigung unrichtiger Daten</li>
            <li>Löschung Ihrer Daten</li>
            <li>Einschränkung der Verarbeitung</li>
            <li>Widerspruch gegen die Verarbeitung</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hierzu genügt eine formlose Mitteilung per E-Mail.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">8. Datensicherheit</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wir verwenden geeignete technische und organisatorische Sicherheitsmaßnahmen,
            um Ihre Daten gegen Manipulation, Verlust oder unbefugten Zugriff zu schützen.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">9. Änderungen</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets
            den aktuellen rechtlichen Anforderungen entspricht.
          </p>
        </section>
      </div>
    </main>
  );
}