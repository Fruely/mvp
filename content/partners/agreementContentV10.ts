import type { Lang } from "@/lib/i18n";

/** Immutable Partner Agreement v1.0 — do not edit after production acceptances. */
export const PARTNER_AGREEMENT_V10_VERSION = "1.0";
export const PARTNER_AGREEMENT_V10_EFFECTIVE_DATE = "2026-07-25";
const PARTNER_AGREEMENT_V10_TITLE = {
  de: "Partnerprogramm-Bedingungen von Freuly",
  ru: "Условия партнёрской программы Freuly",
  ua: "Умови партнерської програми Freuly",
} as const;
const PARTNER_PROVIDER_V10 = {
  name: "Natalia Sheshenia",
  tradeName: "Sheshenia – Freuly",
  street: "Hofolper Straße 46",
  cityLine: "57399 Kirchhundem OT Hofolpe",
  country: "Deutschland",
  email: "freuly.de@gmail.com",
  phone: "+49 160 92686432",
} as const;
const PARTNER_REWARD_VALIDATION_DAYS_V10 = 14;

export type AgreementBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

const P = PARTNER_PROVIDER_V10;
const V = PARTNER_AGREEMENT_V10_VERSION;
const D = PARTNER_AGREEMENT_V10_EFFECTIVE_DATE;
const DAYS = PARTNER_REWARD_VALIDATION_DAYS_V10;

function providerLines(lang: Lang): string {
  if (lang === "de") {
    return `${P.name}, handelnd unter der Geschäftsbezeichnung „${P.tradeName}“, ${P.street}, ${P.cityLine}, ${P.country}. E-Mail: ${P.email}. Telefon: ${P.phone}.`;
  }
  if (lang === "ua") {
    return `${P.name}, що діє під комерційним найменуванням „${P.tradeName}“, ${P.street}, ${P.cityLine}, ${P.country}. E-mail: ${P.email}. Телефон: ${P.phone}.`;
  }
  return `${P.name}, действующая под коммерческим обозначением «${P.tradeName}», ${P.street}, ${P.cityLine}, ${P.country}. E-mail: ${P.email}. Телефон: ${P.phone}.`;
}

/** Canonical German v1.0 text — frozen for hash verification of existing acceptances. */
export function getGermanAgreementPlainTextV10(): string {
  return getPartnerAgreementV10("de")
    .blocks.map((b) => {
      if (b.type === "h2") return b.text;
      if (b.type === "ul") return b.items.map((i) => `- ${i}`).join("\n");
      return b.text;
    })
    .join("\n\n");
}

export function getPartnerAgreementV10(lang: Lang): {
  version: string;
  effectiveDate: string;
  title: string;
  governingNote: string | null;
  blocks: AgreementBlock[];
} {
  if (lang === "de") {
    return {
      version: V,
      effectiveDate: D,
      title: `${PARTNER_AGREEMENT_V10_TITLE.de} — Version ${V}`,
      governingNote: null,
      blocks: [
        {
          type: "h2",
          text: "§ 1 Anbieter und Geltungsbereich",
        },
        {
          type: "p",
          text: `Anbieter des Partnerprogramms ist ${providerLines("de")}`,
        },
        {
          type: "p",
          text: `Diese Partnerprogramm-Bedingungen von Freuly (Version ${V}, wirksam ab ${D}) regeln die Teilnahme am Partnerprogramm der Plattform Freuly („Programm“). Maßgebliche Fassung ist die deutsche Sprachfassung.`,
        },
        {
          type: "h2",
          text: "§ 2 Teilnahme",
        },
        {
          type: "p",
          text: "Teilnahmeberechtigt sind volljährige natürliche Personen, Selbständige/Freiberufler, Einzelunternehmer, juristische Personen sowie sonstige Organisationen, soweit sie rechtlich zur Teilnahme befugt sind. Das Vorliegen eines Gewerbes ist für natürliche Personen nicht zwingende Voraussetzung.",
        },
        {
          type: "p",
          text: "Die Teilnahme erfolgt durch elektronische Annahme dieser Bedingungen. Eine vorherige Freigabe durch Freuly-Admin ist für die normale Teilnahme nicht erforderlich. Freuly kann die Teilnahme aus wichtigem Grund (insbesondere Missbrauch) sperren oder beenden.",
        },
        {
          type: "p",
          text: "Der Partner ist selbst für steuerliche, registrierungsbezogene und öffentlich-rechtliche Pflichten verantwortlich. Freuly erbringt keine Steuer- oder Rechtsberatung.",
        },
        {
          type: "h2",
          text: "§ 3 Referral-Link",
        },
        {
          type: "p",
          text: "Nach wirksamer Teilnahme erhält der Partner einen persönlichen Referral-Link bzw. Referral-Code. Dieser gehört ausschließlich dem Partnerkonto, dem er zugeordnet ist. Das Kopieren oder Verbreiten eines fremden Codes überträgt kein Recht auf Vergütung. Für eine eigene Vergütung ist die eigene Teilnahme und der eigene Code erforderlich.",
        },
        {
          type: "p",
          text: "Der persönliche Referral-Link darf öffentlich und wiederholt genutzt werden, solange Partner und Programm aktiv sind. Die Attribution eines anonymen Besuchs bis zur Registrierung gilt für 90 Tage ab dem ersten gültigen Referral-Touch (First-Touch). Innerhalb dieses Fensters überschreibt ein späterer Klick einer anderen Partner-Link die bestehende Attribution nicht. Nach Registrierung ist die Attribution gesperrt.",
        },
        {
          type: "p",
          text: "Eine Vergütung setzt eine technisch nachvollziehbare Attribution gemäß den Systemregeln von Freuly voraus. Eine manuelle Zuordnung wird nicht zugesagt, wenn die Herkunft einer Registrierung nicht zuverlässig festgestellt werden kann.",
        },
        {
          type: "h2",
          text: "§ 4 Qualifizierte Empfehlung",
        },
        {
          type: "p",
          text: "Eine Vergütung entsteht nur für einen neuen Spezialisten, der (1) über die Referral-Attribution des Partners gekommen ist, (2) erstmals als Spezialist auf Freuly registriert wurde, (3) erstmals ein kostenpflichtiges Abonnement abgeschlossen hat, (4) die erste erfolgreiche Zahlung geleistet hat und (5) die Empfehlung nicht gegen diese Bedingungen verstößt.",
        },
        {
          type: "p",
          text: "Pro Spezialist kann höchstens eine Referral-Vergütung entstehen. Keine neue Vergütung entsteht insbesondere durch Verlängerungen, Folgemonate, Upgrades, Downgrades, erneute Registrierungen, spätere Rückkehr desselben Spezialisten oder sonstige Folgekäufe.",
        },
        {
          type: "h2",
          text: "§ 5 Höhe der Vergütung",
        },
        {
          type: "p",
          text: "Der Partner erhält eine einmalige Vergütung in Höhe der ersten bezahlten monatlichen Tarifbasis des vermittelten Spezialisten, berechnet aus dem von Freuly tatsächlich vereinnahmten Betrag. Abgezogen werden nur (a) gesetzlich geschuldete Umsatzsteuer, soweit sie auf die konkrete Zahlung entfällt, und (b) die tatsächliche Transaktionsgebühr des Zahlungsdienstleisters, die dieser Zahlung unmittelbar zuzuordnen ist.",
        },
        {
          type: "p",
          text: "Nicht abgezogen werden Einkommensteuer, Gewerbesteuer, allgemeine Betriebskosten, Marketingkosten oder sonstige mittelbare Kosten. Die Höhe richtet sich nach dem tatsächlich gewählten monatlichen Tarif und ist nicht auf einen festen Betrag beschränkt. Eine Jahreszahlung führt nicht automatisch zur Auszahlung des gesamten Jahresbetrags; dieses Programm bezieht sich auf die erste monatliche Abo-Konversion.",
        },
        {
          type: "h2",
          text: "§ 6 Entstehung und Validierung",
        },
        {
          type: "p",
          text: `Nach der ersten erfolgreichen Zahlung gilt die Vergütung zunächst als „pending“. Es folgt eine Validierungsfrist von ${DAYS} Kalendertagen. Nach Ablauf dieser Frist kann die Vergütung „confirmed/payable“ werden, sofern die Ausgangszahlung zu diesem Zeitpunkt nicht storniert, erstattet, reversed oder disputed ist, die Konversion weiterhin qualifiziert ist und kein Verstoß gegen diese Bedingungen vorliegt.`,
        },
        {
          type: "p",
          text: `Die Frist von ${DAYS} Tagen ist eine Validierungsregel des Partnerprogramms. Sie bedeutet nicht, dass Zahlungen danach rechtlich nicht mehr zurückgefordert oder bestritten werden können; spätere Kartendispute/Chargebacks bleiben ein eigenständiges Zahlungsrisiko.`,
        },
        {
          type: "h2",
          text: "§ 7 Auszahlung und Freuly-Guthaben",
        },
        {
          type: "p",
          text: "Nach Bestätigung einer Vergütung kann der Partner wählen: (a) Auszahlung in Geld über den eingesetzten Auszahlungsdienstleister, oder (b) Verwendung des bestätigten Betrags ganz oder teilweise als Guthaben für das eigene Freuly-Abonnement. Derselbe Betrag kann nicht zugleich ausgezahlt und als Abo-Guthaben verwendet werden. Es gibt keinen Mindestauszahlungsbetrag.",
        },
        {
          type: "p",
          text: "Die Nutzung als Abo-Guthaben ist kein Self-Referral; Voraussetzung ist eine bereits berechtigt erworbene Vergütung für einen unabhängigen Drittspezialisten. Der tatsächliche Zahlungseingang bei Auszahlung kann von Stripe, der Bank oder dem Auszahlungsdienstleister abhängen; eine konkrete Bankgutschriftfrist wird nicht zugesagt.",
        },
        {
          type: "h2",
          text: "§ 8 Keine fortlaufende Beteiligung",
        },
        {
          type: "p",
          text: "Das Programm gewährt keine laufende Umsatzbeteiligung an Folgezahlen oder an der weiteren Plattformnutzung des vermittelten Spezialisten. Es handelt sich um eine einmalige Acquisition-Vergütung.",
        },
        {
          type: "h2",
          text: "§ 9 Missbrauch und unzulässige Empfehlungen",
        },
        {
          type: "p",
          text: "Keine Vergütung entsteht insbesondere bei Self-Referral (eigene Person, eigener Spezialisten-Account, eigene Subscription), Empfehlungen von Ehepartnern, eingetragenen Lebenspartnern oder Personen, die mit dem Partner in einem gemeinsamen Haushalt leben, sowie bei Scheinkonten, Doppelregistrierungen, Identitätsfälschung, Manipulation der Attribution, automatisierten Scheinregistrierungen, Registrierungen/Zahlungen hauptsächlich zur künstlichen Erzeugung von Rewards, koordiniertem Zahlungs-/Erstattungsmissbrauch, Spam, irreführender Werbung oder sonstigen künstlichen Konversionen.",
        },
        {
          type: "p",
          text: "Zulässig sind Empfehlungen von Freunden, Bekannten, Kollegen, Nachbarn, Community-Mitgliedern und der eigenen Öffentlichkeit/Audience, sofern kein Self-Referral und kein Haushaltsmissbrauch vorliegt und die übrigen Bedingungen erfüllt sind.",
        },
        {
          type: "p",
          text: "Bei objektiven Anhaltspunkten für Missbrauch darf Freuly eine noch nicht bestätigte Vergütung vorübergehend zur Prüfung zurückhalten. Freuly behält sich kein willkürliches Recht vor, ohne nachvollziehbaren Grund nicht zu zahlen.",
        },
        {
          type: "h2",
          text: "§ 10 Werbung und Kommunikation",
        },
        {
          type: "p",
          text: "Der Partner darf den Referral-Link persönlich, in sozialen Netzwerken, über Blog, Website, Community oder andere rechtmäßige Kanäle verbreiten. Der Partner ist kein Arbeitnehmer, Handelsvertreter, Bevollmächtigter oder sonstiger offizieller Vertreter von Freuly.",
        },
        {
          type: "p",
          text: "Der Partner darf keine Verträge im Namen von Freuly schließen, keinen garantierten Verdienst oder Kundenstrom zusagen, keine falschen Angaben zu Freuly machen und sich nicht als offizieller Freuly-Account ausgeben. Der Partner ist für gesetzlich erforderliche Werbekennzeichnung selbst verantwortlich.",
        },
        {
          type: "h2",
          text: "§ 11 Marken und Inhalte",
        },
        {
          type: "p",
          text: "Gestattet sind die Nutzung des Namens Freuly, der Referral-Links, offiziell bereitgestellter Werbemittel sowie des Logos nur im Rahmen erlaubter Programmwerbung. Unzulässig sind insbesondere der Eindruck einer offiziellen Vertretung, Fake-Domains, Fake-Social-Accounts, irreführende Anzeigen sowie jede Nutzung, die Freuly schädigen kann.",
        },
        {
          type: "h2",
          text: "§ 12 Steuern und öffentlich-rechtliche Pflichten",
        },
        {
          type: "p",
          text: "Der Partner prüft und erfüllt selbst etwaige Pflichten zu Einkommensteuer, Gewerbe, Umsatzsteuer/VAT, Registrierungen und sozialversicherungs- bzw. öffentlich-rechtlichen Vorgaben, soweit sie auf ihn anwendbar sind. Freuly trifft keine verbindliche steuerliche Einordnung einzelner Einnahmen. Freuly darf Behörden Auskünfte erteilen, soweit gesetzlich verpflichtet.",
        },
        {
          type: "h2",
          text: "§ 13 Voraussetzungen für die Auszahlung von Partnervergütungen",
        },
        {
          type: "p",
          text: "Die Teilnahme am Partnerprogramm und die Entstehung bestätigter Partnervergütungen setzen zunächst keine Angabe von Steuer- oder Auszahlungsdaten voraus.",
        },
        {
          type: "p",
          text: "Vor einer erstmaligen Auszahlung in Geld muss der Partner jedoch die von Freuly für die ordnungsgemäße Abrechnung, Buchführung, steuerliche Dokumentation und Durchführung der Auszahlung benötigten Angaben und, soweit erforderlich, Nachweise bereitstellen.",
        },
        {
          type: "p",
          text: "Hierzu können insbesondere Name beziehungsweise Unternehmensbezeichnung, Anschrift, Land, Angaben zum steuerlichen oder unternehmerischen Status, erforderliche steuerliche Identifikationsdaten sowie Angaben gehören, die vom eingesetzten Zahlungsdienstleister für die Auszahlung benötigt werden.",
        },
        {
          type: "p",
          text: "Welche Angaben im Einzelfall erforderlich sind, richtet sich insbesondere nach dem Status des Partners, den gesetzlichen Anforderungen und der verwendeten Auszahlungsmethode.",
        },
        {
          type: "p",
          text: "Bis die erforderlichen Angaben und Nachweise vollständig vorliegen, kann Freuly die Auszahlung zurückstellen. Bereits bestätigte Partnervergütungen verfallen hierdurch nicht.",
        },
        {
          type: "p",
          text: "Der Partner ist verpflichtet, die für die Auszahlung gemachten Angaben vollständig und richtig anzugeben und Änderungen mitzuteilen.",
        },
        {
          type: "h2",
          text: "§ 14 Laufzeit / Beendigung durch den Partner",
        },
        {
          type: "p",
          text: "Der Partner kann die Teilnahme jederzeit beenden. Bereits bestätigte Vergütungen bleiben erhalten. Qualifizierende Zahlungen, deren Vergütung sich noch in der Validierungsfrist befindet, werden nach den bei Konversion geltenden Bedingungen abgeschlossen, sofern kein Verstoß vorliegt.",
        },
        {
          type: "h2",
          text: "§ 15 Änderung / Aussetzung / Beendigung durch Freuly",
        },
        {
          type: "p",
          text: "Freuly darf das Programm für die Zukunft ändern, aussetzen, beenden, Vergütungshöhen, Eligibility, Kampagnen, Tarifbezüge oder den geografischen Umfang anpassen. Rückwirkende Entziehung bereits bestätigter Vergütungen findet nicht statt. Nach Beendigung des Programms entstehen für neue Konversionen keine neuen Vergütungen.",
        },
        {
          type: "h2",
          text: "§ 16 Sperrung aus wichtigem Grund",
        },
        {
          type: "p",
          text: "Bei wichtigem Grund, insbesondere bei Missbrauch, Identitätsfälschung, schwerwiegenden Pflichtverletzungen oder Rechtsverstößen, darf Freuly den Partnerzugang sperren oder beenden. Ansprüche auf bereits bestätigte Vergütungen bleiben unberührt, soweit kein missbräuchlicher Ursprung vorliegt.",
        },
        {
          type: "h2",
          text: "§ 17 Verfügbarkeit",
        },
        {
          type: "p",
          text: "Freuly bemüht sich um eine stabile Verfügbarkeit von Plattform und Tracking, schuldet jedoch keine ununterbrochene Erreichbarkeit. Wartung, Störungen Dritter oder höhere Gewalt können die Nutzung vorübergehend beeinträchtigen.",
        },
        {
          type: "h2",
          text: "§ 18 Haftung",
        },
        {
          type: "p",
          text: "Freuly haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Bei leichter Fahrlässigkeit haftet Freuly nur bei Verletzung wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren, vertragstypischen Schaden. Zwingende gesetzliche Haftung bleibt unberührt. Gesetzliche Verbraucherrechte werden nicht ausgeschlossen.",
        },
        {
          type: "h2",
          text: "§ 19 Anwendbares Recht",
        },
        {
          type: "p",
          text: "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften des Wohnsitzstaates eines Verbrauchers bleiben unberührt, soweit anwendbar.",
        },
        {
          type: "h2",
          text: "§ 20 Gerichtsstand",
        },
        {
          type: "p",
          text: "Ist der Partner Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand der Sitz von Freuly. Gegenüber Verbrauchern gilt kein ausschließlicher Gerichtsstand zulasten des Verbrauchers.",
        },
        {
          type: "h2",
          text: "§ 21 Schlussbestimmungen",
        },
        {
          type: "p",
          text: "Sollten einzelne Bestimmungen unwirksam sein, bleibt der übrige Vertrag wirksam. An die Stelle der unwirksamen Bestimmung tritt die gesetzlich zulässige Regelung, die dem wirtschaftlichen Zweck am nächsten kommt. Die deutsche Fassung ist maßgeblich.",
        },
      ],
    };
  }

  if (lang === "ua") {
    return {
      version: V,
      effectiveDate: D,
      title: `${PARTNER_AGREEMENT_V10_TITLE.ua} — версія ${V}`,
      governingNote:
        "У разі розбіжностей між цим перекладом і німецькою версією юридично визначальною є німецька версія, наскільки це дозволено законом.",
      blocks: [
        { type: "h2", text: "§ 1 Постачальник і сфера дії" },
        {
          type: "p",
          text: `Постачальник партнерської програми: ${providerLines("ua")}`,
        },
        {
          type: "p",
          text: `Ці Умови партнерської програми Freuly (версія ${V}, чинні з ${D}) регулюють участь у партнерській програмі платформи Freuly. Юридично визначальною є німецька редакція.`,
        },
        { type: "h2", text: "§ 2 Участь" },
        {
          type: "p",
          text: "Брати участь можуть повнолітні фізичні особи, самозайняті/фрилансери, індивідуальні підприємці, юридичні особи та інші організації, якщо вони мають правову можливість участі. Наявність Gewerbe не є обов’язковою умовою для звичайної фізичної особи.",
        },
        {
          type: "p",
          text: "Участь відбувається через електронне прийняття цих умов. Попереднє схвалення адміном Freuly для звичайної участі не потрібне. Freuly може заблокувати або припинити участь з важливої причини (зокрема abuse).",
        },
        {
          type: "p",
          text: "Партнер самостійно відповідає за податкові, реєстраційні та публічно-правові обов’язки. Freuly не надає податкових або юридичних консультацій.",
        },
        { type: "h2", text: "§ 3 Referral-посилання" },
        {
          type: "p",
          text: "Після участі партнер отримує персональне referral-посилання / код. Він належить лише партнерському акаунту, за яким закріплений. Копіювання чи поширення чужого коду не передає права на винагороду. Для власної винагороди потрібна власна участь і власний код.",
        },
        {
          type: "p",
          text: "Персональне referral-посилання можна поширювати публічно й багаторазово, поки партнер і програма активні. Attribution анонімного візиту до реєстрації діє 90 днів від першого валідного referral-touch (first-touch). Усередині цього вікна пізніший клік іншої партнерської ланки не перезаписує attribution. Після реєстрації attribution фіксується.",
        },
        {
          type: "p",
          text: "Винагорода можлива лише за технічно достовірної attribution за правилами Freuly. Ручна атрибуція не гарантується, якщо джерело реєстрації неможливо надійно встановити.",
        },
        { type: "h2", text: "§ 4 Кваліфікована рекомендація" },
        {
          type: "p",
          text: "Винагорода виникає лише за НОВОГО спеціаліста, який (1) прийшов через referral attribution партнера, (2) вперше зареєстрований як specialist на Freuly, (3) вперше оформив платну підписку, (4) здійснив першу успішну оплату і (5) рекомендація не порушує ці умови.",
        },
        {
          type: "p",
          text: "Один specialist може створити лише одну referral-винагороду. Не створюють нової винагороди: renewal, наступні місяці, upgrade/downgrade, повторна реєстрація, повернення того самого спеціаліста пізніше чи будь-які подальші покупки.",
        },
        { type: "h2", text: "§ 5 Розмір винагороди" },
        {
          type: "p",
          text: "Партнер отримує одноразову винагороду, що відповідає вартості першого оплаченого місячного тарифу залученого specialist, на базі фактично отриманої Freuly суми. З неї віднімаються лише: (a) gesetzlich geschuldete Umsatzsteuer, якщо застосовується до конкретного платежу; (b) фактична transaction fee платіжного провайдера, що безпосередньо стосується цього платежу.",
        },
        {
          type: "p",
          text: "Не віднімаються Einkommensteuer, Gewerbesteuer, загальні операційні чи маркетингові витрати. Розмір залежить від фактичного місячного тарифу і не фіксується жорстко. Річний тариф не означає автоматичної виплати всієї річної суми; програма орієнтована на першу місячну subscription conversion.",
        },
        { type: "h2", text: "§ 6 Виникнення і валідація" },
        {
          type: "p",
          text: `Після першої успішної оплати винагорода має статус pending. Період перевірки — ${DAYS} календарних днів. Після цього винагорода може стати confirmed/payable, якщо платіж не cancelled/refunded/reversed/disputed, conversion залишається кваліфікованою і немає порушення правил.`,
        },
        {
          type: "p",
          text: `${DAYS} днів — це validation rule програми, а не твердження, що платіж після цього неможливо повернути чи оскаржити. Пізні card disputes/chargebacks залишаються окремим payment risk.`,
        },
        { type: "h2", text: "§ 7 Виплата та Freuly-кредит" },
        {
          type: "p",
          text: "Після confirmed reward партнер може обрати: (a) грошову виплату через payout provider, або (b) використання підтвердженої суми повністю чи частково як кредиту на власну підписку Freuly. Ту саму суму не можна одночасно виплатити й використати як кредит. Мінімального порогу виплати немає.",
        },
        {
          type: "p",
          text: "Використання як кредиту на підписку не є self-referral; умова — уже законно зароблена винагорода за незалежного стороннього specialist. Фактичне зарахування при грошовій виплаті може залежати від Stripe/банку/провайдера.",
        },
        { type: "h2", text: "§ 8 Відсутність постійної частки" },
        {
          type: "p",
          text: "Програма не дає постійної участі в подальших платежах спеціаліста. Це одноразова acquisition-винагорода.",
        },
        { type: "h2", text: "§ 9 Зловживання" },
        {
          type: "p",
          text: "Винагорода не нараховується зокрема за self-referral (власна особа, власний specialist-акаунт, власна підписка), рекомендації подружжя / зареєстрованого партнера / осіб спільного домогосподарства, а також за фейкові акаунти, дублікати реєстрацій, маніпуляцію attribution, штучні conversions, spam чи оманливу рекламу.",
        },
        {
          type: "p",
          text: "Дозволені рекомендації друзів, знайомих, колег, сусідів, community та власної аудиторії, якщо немає self-referral чи household abuse і виконуються інші умови.",
        },
        {
          type: "p",
          text: "За об’єктивних ознак abuse Freuly може тимчасово утримати ще не підтверджений reward для перевірки. Довільного права «не платити без пояснення» немає.",
        },
        { type: "h2", text: "§ 10 Реклама і комунікація" },
        {
          type: "p",
          text: "Партнер може поширювати referral link особисто, у соцмережах, блозі, на сайті, у community та інших законних каналах. Він не є працівником, Handelsvertreter, Bevollmächtigter чи офіційним представником Freuly.",
        },
        {
          type: "p",
          text: "Заборонено укладати договори від імені Freuly, обіцяти гарантований дохід чи потік клієнтів, надавати неправдиві відомості про Freuly або видавати себе за офіційний акаунт Freuly. Партнер відповідає за Werbekennzeichnung, якщо вона вимагається законом.",
        },
        { type: "h2", text: "§ 11 Бренд і контент" },
        {
          type: "p",
          text: "Дозволено використовувати назву Freuly, referral links, офіційно надані advertising assets і логотип лише в межах дозволеного просування. Заборонено створювати враження офіційного представництва, fake-домени/акаунти, оманливі оголошення чи інше шкідливе використання бренду.",
        },
        { type: "h2", text: "§ 12 Податки та публічно-правові обов’язки" },
        {
          type: "p",
          text: "Партнер самостійно визначає і виконує свої обов’язки щодо Einkommensteuer, Gewerbe, VAT/Umsatzsteuer, реєстрації та інших публічно-правових вимог, якщо вони до нього застосовуються. Freuly не стверджує єдину податкову кваліфікацію доходу. Freuly може надавати відомості органам влади, якщо зобов’язана законом.",
        },
        { type: "h2", text: "§ 13 Умови отримання грошової партнерської винагороди" },
        {
          type: "p",
          text: "Для участі в партнерській програмі та нарахування підтвердженої партнерської винагороди на початковому етапі не потрібно надавати податкові або платіжні дані.",
        },
        {
          type: "p",
          text: "Проте перед першою грошовою виплатою партнер зобов’язаний надати Freuly відомості та, за потреби, документи, необхідні для коректного розрахунку, бухгалтерського та податкового документування, а також проведення виплати.",
        },
        {
          type: "p",
          text: "Серед іншого це можуть бути ім’я або найменування організації, адреса, країна, відомості про податковий або підприємницький статус, необхідні податкові ідентифікаційні дані, а також відомості, які вимагає обраний платіжний провайдер.",
        },
        {
          type: "p",
          text: "Конкретний склад даних залежить, зокрема, від статусу партнера, застосовних законодавчих вимог і обраного способу виплати.",
        },
        {
          type: "p",
          text: "До надання необхідних відомостей і документів Freuly може відкласти грошову виплату. Уже підтверджена партнерська винагорода при цьому не анулюється.",
        },
        {
          type: "p",
          text: "Партнер зобов’язаний надавати коректні та повні відомості для виплати й повідомляти про їх зміни.",
        },
        { type: "h2", text: "§ 14 Строк / припинення партнером" },
        {
          type: "p",
          text: "Партнер може припинити участь у будь-який час. Уже confirmed rewards зберігаються. Якщо qualifying payment уже відбувся і reward у 14-денному pending, він завершується за умовами версії на момент conversion, якщо немає порушення.",
        },
        { type: "h2", text: "§ 15 Зміна / зупинка / припинення Freuly" },
        {
          type: "p",
          text: "Freuly може на майбутнє змінювати, призупиняти чи закривати програму, змінювати розмір rewards, eligibility, кампанії, тарифи чи географію. Ретроактивної втрати вже confirmed rewards немає. Після дати припинення нові conversions rewards не створюють.",
        },
        { type: "h2", text: "§ 16 Блокування з важливої причини" },
        {
          type: "p",
          text: "За важливої причини, зокрема abuse чи серйозні порушення, Freuly може заблокувати або припинити доступ партнера. Вимоги щодо вже confirmed rewards зберігаються, якщо немає зловмисного походження.",
        },
        { type: "h2", text: "§ 17 Доступність" },
        {
          type: "p",
          text: "Freuly прагне стабільної роботи платформи і tracking, але не гарантує безперервну доступність.",
        },
        { type: "h2", text: "§ 18 Відповідальність" },
        {
          type: "p",
          text: "Freuly відповідає необмежено за умисел і грубу необережність, а також за шкоду життю, тілу чи здоров’ю. За легкої необережності — лише за порушення істотних обов’язків і в межах передбачуваної типової шкоди. Імперативні норми та права споживачів не виключаються.",
        },
        { type: "h2", text: "§ 19 Застосовне право" },
        {
          type: "p",
          text: "Застосовується право Федеративної Республіки Німеччина. Імперативні норми захисту споживачів місця проживання споживача залишаються чинними, якщо застосовуються.",
        },
        { type: "h2", text: "§ 20 Підсудність" },
        {
          type: "p",
          text: "Для підприємців/юридичних осіб місцем розгляду може бути місцезнаходження Freuly. Для споживачів виключна підсудність не встановлюється на їхню шкоду.",
        },
        { type: "h2", text: "§ 21 Прикінцеві положення" },
        {
          type: "p",
          text: "Недійсність окремих положень не впливає на решту умов. Німецька версія є визначальною.",
        },
      ],
    };
  }

  return {
    version: V,
    effectiveDate: D,
    title: `${PARTNER_AGREEMENT_V10_TITLE.ru} — версия ${V}`,
    governingNote:
      "При расхождениях между этим переводом и немецкой версией юридически определяющей является немецкая версия, насколько это допускается законом.",
    blocks: [
      { type: "h2", text: "§ 1 Поставщик и сфера действия" },
      {
        type: "p",
        text: `Поставщик партнёрской программы: ${providerLines("ru")}`,
      },
      {
        type: "p",
        text: `Настоящие Условия партнёрской программы Freuly (версия ${V}, действуют с ${D}) регулируют участие в партнёрской программе платформы Freuly. Юридически определяющей является немецкая редакция.`,
      },
      { type: "h2", text: "§ 2 Участие" },
      {
        type: "p",
        text: "Участвовать могут совершеннолетние физические лица, самозанятые/фрилансеры, индивидуальные предприниматели, юридические лица и иные организации, если они вправе участвовать. Наличие Gewerbe не является обязательным условием для обычного физлица.",
      },
      {
        type: "p",
        text: "Участие происходит через электронное принятие этих условий. Предварительное одобрение админом Freuly для обычного вступления не требуется. Freuly может заблокировать или прекратить участие по важной причине (в частности abuse).",
      },
      {
        type: "p",
        text: "Партнёр самостоятельно отвечает за налоговые, регистрационные и публично-правовые обязанности. Freuly не оказывает налоговое или юридическое консультирование.",
      },
      { type: "h2", text: "§ 3 Referral-ссылка" },
      {
        type: "p",
        text: "После участия партнёр получает персональную referral-ссылку / код. Он принадлежит только партнёрскому аккаунту, за которым закреплён. Копирование или распространение чужого кода не передаёт права на вознаграждение. Для собственного вознаграждения нужны собственное участие и собственный код.",
      },
      {
        type: "p",
        text: "Персональную referral-ссылку можно распространять публично и многократно, пока партнёр и программа активны. Attribution анонимного визита до регистрации действует 90 дней с первого валидного referral-touch (first-touch). Внутри этого окна поздний клик другой партнёрской ссылки не перезаписывает attribution. После регистрации attribution фиксируется.",
      },
      {
        type: "p",
        text: "Вознаграждение возможно только при технически достоверной attribution по правилам Freuly. Ручная атрибуция не обещается, если источник регистрации нельзя надёжно установить.",
      },
      { type: "h2", text: "§ 4 Квалифицированная рекомендация" },
      {
        type: "p",
        text: "Вознаграждение возникает только за НОВОГО специалиста, который (1) пришёл через referral attribution партнёра, (2) впервые зарегистрирован как specialist на Freuly, (3) впервые оформил платную подписку, (4) совершил первую успешную оплату и (5) рекомендация не нарушает эти условия.",
      },
      {
        type: "p",
        text: "Один specialist может создать только одно referral reward. Не создают нового reward: renewal, следующий месяц, upgrade/downgrade, повторная регистрация, возвращение того же специалиста позже или любые последующие покупки.",
      },
      { type: "h2", text: "§ 5 Размер вознаграждения" },
      {
        type: "p",
        text: "Партнёр получает одноразовое вознаграждение, соответствующее стоимости первого оплаченного месячного тарифа привлечённого specialist, на базе фактически полученной Freuly суммы. Из неё вычитаются только: (a) gesetzlich geschuldete Umsatzsteuer, если применима к конкретному платежу; (b) фактическая transaction fee платёжного провайдера, непосредственно относящаяся к этому платежу.",
      },
      {
        type: "p",
        text: "Не вычитаются Einkommensteuer, Gewerbesteuer, общие операционные и маркетинговые расходы. Размер зависит от фактического месячного тарифа и не фиксируется жёстко. Годовой тариф не означает автоматической выплаты всей годовой суммы; программа ориентирована на первую месячную subscription conversion.",
      },
      { type: "h2", text: "§ 6 Возникновение и валидация" },
      {
        type: "p",
        text: `После первой успешной оплаты reward имеет статус pending. Период проверки — ${DAYS} календарных дней. После этого reward может стать confirmed/payable, если платёж не cancelled/refunded/reversed/disputed, conversion остаётся квалифицированной и нет нарушения правил.`,
      },
      {
        type: "p",
        text: `${DAYS} дней — это validation rule программы, а не утверждение, что платёж после этого нельзя вернуть или оспорить. Поздние card disputes/chargebacks остаются отдельным payment risk.`,
      },
      { type: "h2", text: "§ 7 Выплата и Freuly-кредит" },
      {
        type: "p",
        text: "После confirmed reward партнёр может выбрать: (a) денежную выплату через payout provider, или (b) использование подтверждённой суммы полностью или частично как кредита на собственную подписку Freuly. Одну и ту же сумму нельзя одновременно выплатить и использовать как кредит. Минимального порога выплаты нет.",
      },
      {
        type: "p",
        text: "Использование как кредита на подписку не является self-referral; условие — уже законно заработанное вознаграждение за независимого стороннего specialist. Фактическое поступление при денежной выплате может зависеть от Stripe/банка/провайдера.",
      },
      { type: "h2", text: "§ 8 Отсутствие постоянного участия" },
      {
        type: "p",
        text: "Программа не даёт постоянной доли от последующих платежей специалиста. Это разовое acquisition-вознаграждение.",
      },
      { type: "h2", text: "§ 9 Злоупотребления" },
      {
        type: "p",
        text: "Вознаграждение не начисляется в частности за self-referral (собственная личность, собственный specialist-аккаунт, собственная подписка), рекомендации супруга / зарегистрированного партнёра / лиц общего домашнего хозяйства, а также за фейковые аккаунты, дубликаты регистраций, манипуляцию attribution, искусственные conversions, spam или вводящую в заблуждение рекламу.",
      },
      {
        type: "p",
        text: "Разрешены рекомендации друзей, знакомых, коллег, соседей, community и собственной аудитории, если нет self-referral или household abuse и выполнены остальные условия.",
      },
      {
        type: "p",
        text: "При объективных признаках abuse Freuly может временно удержать ещё не подтверждённый reward для проверки. Произвольного права «не платить без объяснения причин» нет.",
      },
      { type: "h2", text: "§ 10 Реклама и коммуникация" },
      {
        type: "p",
        text: "Партнёр может распространять referral link лично, в соцсетях, через блог, сайт, community и другие законные каналы. Он не является сотрудником, Handelsvertreter, Bevollmächtigter или официальным представителем Freuly.",
      },
      {
        type: "p",
        text: "Запрещено заключать договоры от имени Freuly, обещать гарантированный доход или поток клиентов, сообщать ложные сведения о Freuly или выдавать себя за официальный аккаунт Freuly. Партнёр отвечает за требуемую законом Werbekennzeichnung.",
      },
      { type: "h2", text: "§ 11 Бренд и контент" },
      {
        type: "p",
        text: "Разрешено использовать название Freuly, referral links, официально предоставленные advertising assets и логотип только в рамках разрешённого продвижения. Запрещено создавать впечатление официального представительства, fake-домены/аккаунты, вводящие в заблуждение объявления или иное вредоносное использование бренда.",
      },
      { type: "h2", text: "§ 12 Налоги и публично-правовые обязанности" },
      {
        type: "p",
        text: "Партнёр самостоятельно определяет и исполняет обязанности по Einkommensteuer, Gewerbe, VAT/Umsatzsteuer, регистрации и иным публично-правовым требованиям, если они к нему применимы. Freuly не утверждает единую налоговую квалификацию дохода. Freuly может предоставлять сведения властям, если обязана это делать по закону.",
      },
      { type: "h2", text: "§ 13 Условия получения денежного партнёрского вознаграждения" },
      {
        type: "p",
        text: "Для участия в партнёрской программе и начисления подтверждённого партнёрского вознаграждения на первоначальном этапе не требуется предоставлять налоговые или платёжные данные.",
      },
      {
        type: "p",
        text: "Однако перед первой денежной выплатой партнёр обязан предоставить Freuly сведения и, если это необходимо, документы, требуемые для корректного расчёта, бухгалтерского и налогового документирования, а также проведения выплаты.",
      },
      {
        type: "p",
        text: "К ним могут относиться, в частности, имя либо наименование организации, адрес, страна, сведения о налоговом или предпринимательском статусе, необходимые налоговые идентификационные данные, а также сведения, которые требуются используемому платёжному провайдеру.",
      },
      {
        type: "p",
        text: "Конкретный состав данных зависит, в частности, от статуса партнёра, применимых законодательных требований и выбранного способа выплаты.",
      },
      {
        type: "p",
        text: "До предоставления необходимых сведений и документов Freuly вправе отложить денежную выплату. Уже подтверждённое партнёрское вознаграждение при этом не аннулируется.",
      },
      {
        type: "p",
        text: "Партнёр обязан предоставить корректные и полные сведения и сообщать об их изменениях.",
      },
      { type: "h2", text: "§ 14 Срок / прекращение партнёром" },
      {
        type: "p",
        text: "Партнёр может прекратить участие в любое время. Уже confirmed rewards сохраняются. Если qualifying payment уже произошёл и reward находится в 14-дневном pending, он завершается по условиям версии на момент conversion при отсутствии нарушения.",
      },
      { type: "h2", text: "§ 15 Изменение / приостановка / прекращение Freuly" },
      {
        type: "p",
        text: "Freuly вправе на будущее изменить, приостановить или закрыть программу, изменить размер rewards, eligibility, кампании, тарифы или географию. Ретроактивной потери уже confirmed rewards нет. После даты прекращения новые conversions rewards не создают.",
      },
      { type: "h2", text: "§ 16 Блокировка по важной причине" },
      {
        type: "p",
        text: "По важной причине, в частности при abuse или серьёзных нарушениях, Freuly может заблокировать или прекратить доступ партнёра. Требования по уже confirmed rewards сохраняются, если нет злоупотребления.",
      },
      { type: "h2", text: "§ 17 Доступность" },
      {
        type: "p",
        text: "Freuly стремится к стабильной работе платформы и tracking, но не гарантирует непрерывную доступность.",
      },
      { type: "h2", text: "§ 18 Ответственность" },
      {
        type: "p",
        text: "Freuly отвечает без ограничения за умысел и грубую неосторожность, а также за вред жизни, телу или здоровью. При лёгкой неосторожности — только за нарушение существенных обязанностей и в пределах предвидимого типичного ущерба. Императивные нормы и права потребителей не исключаются.",
      },
      { type: "h2", text: "§ 19 Применимое право" },
      {
        type: "p",
        text: "Применяется право Федеративной Республики Германия. Императивные нормы защиты потребителей по месту жительства потребителя остаются в силе, если применимы.",
      },
      { type: "h2", text: "§ 20 Подсудность" },
      {
        type: "p",
        text: "Для предпринимателей/юридических лиц местом рассмотрения может быть место нахождения Freuly. Для потребителей исключительная подсудность в их ущерб не устанавливается.",
      },
      { type: "h2", text: "§ 21 Заключительные положения" },
      {
        type: "p",
        text: "Недействительность отдельных положений не затрагивает остальные условия. Немецкая версия является определяющей.",
      },
    ],
  };
}
