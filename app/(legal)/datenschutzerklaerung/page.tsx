import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | Freuly",
  description:
    "Datenschutzerklärung – Informationen zum Umgang mit personenbezogenen Daten auf freuly.de",
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

        <p className="mt-3 text-sm text-muted-foreground">Stand: Mai 2026</p>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">1. Datenschutz auf einen Blick</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Der Schutz Ihrer persönlichen Daten ist uns wichtig. In dieser
            Datenschutzerklärung informieren wir Sie darüber, welche
            personenbezogenen Daten wir auf der Plattform Freuly verarbeiten und
            zu welchen Zwecken dies geschieht.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Freuly ist eine Plattform, auf der Spezialisten eigene Profile
            veröffentlichen können und Nutzer Kontaktanfragen an Spezialisten
            senden können.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">2. Verantwortlicher</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Verantwortlich für die Datenverarbeitung auf dieser Website:
            <br />
            <span className="font-medium text-foreground">Natalia Sheshenia</span>
            <br />
            Hofolpe Str. 46
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
            3. Erhebung und Verarbeitung personenbezogener Daten
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wir verarbeiten personenbezogene Daten, wenn Sie:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            <li>unsere Website besuchen,</li>
            <li>ein Spezialistenprofil erstellen,</li>
            <li>Inhalte für ein Spezialistenprofil veröffentlichen,</li>
            <li>Kontaktanfragen senden,</li>
            <li>
              mit uns per E-Mail, über soziale Netzwerke oder über Telegram
              kommunizieren.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Zu den verarbeiteten Daten können insbesondere gehören:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            <li>Vorname und Nachname,</li>
            <li>E-Mail-Adresse,</li>
            <li>Telefonnummer,</li>
            <li>Profilfoto,</li>
            <li>Portfolio-Bilder,</li>
            <li>Zertifikate und Ausbildungsnachweise,</li>
            <li>Postleitzahl und Stadt,</li>
            <li>angebotene Dienstleistungen,</li>
            <li>Preise,</li>
            <li>Kategorien und Tätigkeitsbeschreibungen,</li>
            <li>Nachrichten und Anfrageinhalte,</li>
            <li>technische Nutzungsdaten.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">4. Registrierung von Spezialisten</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Spezialisten können auf Freuly ein Profil erstellen und Inhalte
            veröffentlichen. Die von Spezialisten bereitgestellten Informationen
            können öffentlich auf der Plattform angezeigt werden.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dazu können insbesondere Name, Profilbeschreibung, Kategorie,
            angebotene Dienstleistungen, Preise, Stadt oder Region, Sprachen,
            Fotos, Portfolio-Inhalte, Zertifikate und weitere berufliche Angaben
            gehören.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Die Veröffentlichung erfolgt freiwillig durch den jeweiligen
            Spezialisten. Spezialisten sind selbst dafür verantwortlich, dass die
            von ihnen bereitgestellten Inhalte, Texte, Bilder, Nachweise und
            Angaben richtig sind und keine Rechte Dritter verletzen.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">
            5. Kontaktanfragen und Weitergabe von Daten
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wenn Nutzer über die Plattform eine Anfrage an einen Spezialisten
            senden, können die angegebenen Kontaktdaten und Inhalte der Anfrage
            an den ausgewählten Spezialisten weitergegeben werden, damit dieser
            die Anfrage bearbeiten und Kontakt aufnehmen kann.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Freuly dient als Plattform zur Darstellung von Spezialistenprofilen
            und zur Weiterleitung von Anfragen. Freuly garantiert keine Aufträge,
            Verträge, Zahlungen, Bewertungen oder eine bestimmte Qualität der
            angebotenen Leistungen.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">
            6. Hosting und technische Dienstleister
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Für den Betrieb der Plattform nutzen wir externe technische
            Dienstleister. Diese Dienstleister können personenbezogene Daten im
            Rahmen ihrer technischen Leistungen verarbeiten.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Hosting und technische Infrastruktur:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            <li>Vercel Inc.</li>
            <li>Supabase Inc.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Supabase kann insbesondere für Authentifizierung, Datenbank,
            Speicherung von Profilinformationen, Dateien und Bildern sowie
            technische Plattformfunktionen eingesetzt werden.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vercel kann insbesondere für Hosting, Auslieferung der Website,
            technische Protokolle und Sicherheitsfunktionen eingesetzt werden.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">7. Technische Nutzungsdaten</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Beim Besuch der Website können automatisch technische Daten
            verarbeitet werden. Dazu können insbesondere gehören:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            <li>IP-Adresse,</li>
            <li>Datum und Uhrzeit der Anfrage,</li>
            <li>aufgerufene Seiten und Dateien,</li>
            <li>Browsertyp und Browserversion,</li>
            <li>verwendetes Betriebssystem,</li>
            <li>Referrer-URL,</li>
            <li>Geräte- und Verbindungsinformationen,</li>
            <li>Server- und Sicherheitsprotokolle.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Diese Daten dienen dem technischen Betrieb, der Sicherheit, der
            Fehleranalyse und der Missbrauchsprävention.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">
            8. Cookies und ähnliche Technologien
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Unsere Website kann Cookies oder ähnliche Technologien verwenden,
            soweit dies für den technischen Betrieb, die Sicherheit, die
            Anmeldung oder die Benutzerfreundlichkeit erforderlich ist.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Technisch notwendige Cookies oder vergleichbare Speichertechnologien
            können eingesetzt werden, um grundlegende Funktionen der Website
            bereitzustellen.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Analyse-, Marketing- oder Tracking-Technologien werden nur
            eingesetzt, soweit hierfür eine vorherige Einwilligung erteilt wurde,
            sofern eine solche gesetzlich erforderlich ist.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">9. Google Analytics</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Diese Website kann Google Analytics, einen Webanalysedienst von
            Google Ireland Limited, einsetzen, um die Nutzung der Website zu
            analysieren und die Plattform zu verbessern.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Google Analytics wird nur nach Ihrer vorherigen Einwilligung
            eingesetzt. Ohne eine erforderliche Einwilligung werden keine
            Google-Analytics-Cookies gesetzt und keine entsprechenden
            Analyse-Tags geladen.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dabei können insbesondere folgende Informationen verarbeitet werden:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            <li>IP-Adresse,</li>
            <li>Browserinformationen,</li>
            <li>Gerätetyp,</li>
            <li>besuchte Seiten,</li>
            <li>Nutzungsdauer,</li>
            <li>Interaktionen mit der Website.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Die Nutzung von Google Analytics erfolgt auf Grundlage Ihrer
            Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Eine erteilte
            Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen
            werden.
          </p>
          <a
            className="text-sm underline underline-offset-4 hover:opacity-80"
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://policies.google.com/privacy
          </a>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">10. Social-Media-Präsenzen</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wir können Onlinepräsenzen in sozialen Netzwerken und Plattformen
            betreiben, insbesondere auf:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            <li>Instagram,</li>
            <li>Threads,</li>
            <li>Facebook,</li>
            <li>TikTok,</li>
            <li>YouTube,</li>
            <li>Telegram.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Beim Besuch unserer Social-Media-Seiten gelten zusätzlich die
            Datenschutzbestimmungen der jeweiligen Plattformbetreiber.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">11. Kommunikation über Telegram</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wir können Telegram-Gruppen, Telegram-Kanäle oder
            Telegram-Kommunikation zur Information über unsere Plattform sowie zur
            Kommunikation mit Nutzern und Spezialisten nutzen.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Bitte beachten Sie, dass bei der Nutzung von Telegram Daten durch
            Telegram verarbeitet werden können. Auf diese Datenverarbeitung durch
            Telegram haben wir keinen vollständigen Einfluss.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">12. Einsatz von KI-Technologien</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Freuly kann Technologien der künstlichen Intelligenz zur Verbesserung
            der Plattformfunktionen, der Nutzererfahrung, der Qualitätssicherung
            oder zur Unterstützung interner Arbeitsprozesse einsetzen.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Eine ausschließlich automatisierte Entscheidungsfindung mit
            rechtlicher oder vergleichbar erheblicher Wirkung findet derzeit
            nicht statt.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">13. Rechtsgrundlagen der Verarbeitung</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Die Verarbeitung personenbezogener Daten erfolgt je nach Zweck
            insbesondere auf Grundlage von:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            <li>Art. 6 Abs. 1 lit. a DSGVO, wenn eine Einwilligung erteilt wurde,</li>
            <li>
              Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Durchführung
              vorvertraglicher oder vertraglicher Maßnahmen erforderlich ist,
            </li>
            <li>
              Art. 6 Abs. 1 lit. c DSGVO, soweit gesetzliche Pflichten bestehen,
            </li>
            <li>
              Art. 6 Abs. 1 lit. f DSGVO auf Grundlage berechtigter Interessen am
              sicheren, funktionsfähigen und wirtschaftlichen Betrieb der
              Plattform.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">14. Speicherdauer</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wir speichern personenbezogene Daten nur so lange, wie dies für die
            jeweiligen Zwecke erforderlich ist oder gesetzliche
            Aufbewahrungspflichten bestehen.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wenn ein Nutzerkonto oder Spezialistenprofil gelöscht wird, werden die
            zugehörigen Daten gelöscht oder eingeschränkt, soweit keine
            gesetzlichen Pflichten oder berechtigten Gründe für eine weitere
            Speicherung bestehen.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">15. Rechte der betroffenen Personen</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sie haben im Rahmen der gesetzlichen Voraussetzungen jederzeit das
            Recht auf:
          </p>
          <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
            <li>Auskunft über Ihre gespeicherten Daten,</li>
            <li>Berichtigung unrichtiger Daten,</li>
            <li>Löschung Ihrer Daten,</li>
            <li>Einschränkung der Verarbeitung,</li>
            <li>Datenübertragbarkeit,</li>
            <li>Widerspruch gegen die Verarbeitung,</li>
            <li>Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft.</li>
          </ul>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Hierzu können Sie uns jederzeit kontaktieren.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">
            16. Beschwerderecht bei einer Aufsichtsbehörde
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehörde zu
            beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer
            personenbezogenen Daten gegen Datenschutzrecht verstößt.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">17. Datensicherheit</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wir treffen technische und organisatorische Sicherheitsmaßnahmen, um
            Ihre Daten vor Verlust, Manipulation oder unbefugtem Zugriff zu
            schützen.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">
            18. Änderungen dieser Datenschutzerklärung
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an
            geänderte rechtliche Anforderungen oder technische Entwicklungen
            anzupassen.
          </p>
        </section>
      </div>
    </main>
  );
}
