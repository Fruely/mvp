import Link from "next/link";
import { Alert, Badge, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui";
import {
  dashboardLinkPrimaryClass,
  dashboardLinkSecondaryClass,
} from "@/components/dashboard/dashboardStyles";
import type { SpecialistRow } from "@/lib/specialists/server";
import { getSpecialistOnboardingGateState } from "@/lib/specialists/server";

type Copy = {
  title: string;
  subtitle: string;
  draftBadge: string;
  readyBadge: string;
  channelOff: string;
  draftTitle: string;
  draftBody: string;
  readyTitle: string;
  readyBody: string;
  visibilityTitle: string;
  visibilityBody: string;
  continueSetup: string;
  activate: string;
  editLater: string;
};

const COPY: Record<"ru" | "ua" | "de", Copy> = {
  ru: {
    title: "Ваш канал клиентских заявок",
    subtitle: "Здесь видно, готов ли профиль к активации и участвуете ли вы в коммерческом канале Freuly.",
    draftBadge: "Черновик",
    readyBadge: "Готов к активации",
    channelOff: "Канал не активирован",
    draftTitle: "Завершите настройку",
    draftBody: "Профиль сохранён как черновик и не виден клиентам. Заполните обязательные параметры, чтобы подготовить его к активации.",
    readyTitle: "Всё готово — осталось активировать канал",
    readyBody: "Параметры для подбора заявок настроены. До оплаты профиль остаётся невидимым и не участвует в получении клиентских запросов.",
    visibilityTitle: "Что происходит сейчас",
    visibilityBody: "Ваши данные сохранены. Профиль не опубликован, не показывается клиентам и не участвует в распределении заявок. Вы можете вернуться к нему в любое время.",
    continueSetup: "Продолжить настройку",
    activate: "Активировать канал заявок",
    editLater: "Вернуться к настройке",
  },
  ua: {
    title: "Ваш канал клієнтських заявок",
    subtitle: "Тут видно, чи готовий профіль до активації та чи берете ви участь у комерційному каналі Freuly.",
    draftBadge: "Чернетка",
    readyBadge: "Готовий до активації",
    channelOff: "Канал не активовано",
    draftTitle: "Завершіть налаштування",
    draftBody: "Профіль збережено як чернетку й він не видимий клієнтам. Заповніть обов’язкові параметри, щоб підготувати його до активації.",
    readyTitle: "Усе готово — залишилося активувати канал",
    readyBody: "Параметри для підбору заявок налаштовані. До оплати профіль залишається невидимим і не бере участі в отриманні клієнтських запитів.",
    visibilityTitle: "Що відбувається зараз",
    visibilityBody: "Ваші дані збережені. Профіль не опублікований, не показується клієнтам і не бере участі в розподілі заявок. Ви можете повернутися до нього будь-коли.",
    continueSetup: "Продовжити налаштування",
    activate: "Активувати канал заявок",
    editLater: "Повернутися до налаштування",
  },
  de: {
    title: "Ihr Kanal für Kundenanfragen",
    subtitle: "Hier sehen Sie, ob Ihr Profil zur Aktivierung bereit ist und ob Sie am kommerziellen Freuly-Anfragekanal teilnehmen.",
    draftBadge: "Entwurf",
    readyBadge: "Bereit zur Aktivierung",
    channelOff: "Anfragekanal nicht aktiviert",
    draftTitle: "Einrichtung abschließen",
    draftBody: "Ihr Profil ist als Entwurf gespeichert und für Kunden nicht sichtbar. Vervollständigen Sie die Pflichtangaben, um es für die Aktivierung vorzubereiten.",
    readyTitle: "Alles bereit — jetzt den Anfragekanal aktivieren",
    readyBody: "Die Matching-Angaben sind eingerichtet. Bis zur Zahlung bleibt das Profil unsichtbar und nimmt nicht an Kundenanfragen teil.",
    visibilityTitle: "Aktueller Status",
    visibilityBody: "Ihre Daten sind gespeichert. Das Profil ist nicht veröffentlicht, für Kunden nicht sichtbar und nimmt nicht an der Verteilung von Anfragen teil. Sie können jederzeit zurückkehren.",
    continueSetup: "Einrichtung fortsetzen",
    activate: "Anfragekanal aktivieren",
    editLater: "Zur Einrichtung zurückkehren",
  },
};

function copyFor(lang: string): Copy {
  return COPY[lang === "de" ? "de" : lang === "ua" ? "ua" : "ru"];
}

export default async function DraftDemandChannelDashboard({
  specialist,
  lang,
}: {
  specialist: SpecialistRow;
  lang: string;
}) {
  const copy = copyFor(lang);
  const gate = await getSpecialistOnboardingGateState(specialist);
  const ready = gate.state === "ready";
  const onboardingHref = `/${lang}/specialist/dashboard/onboarding`;
  const reviewHref = `/${lang}/specialist/dashboard/onboarding?step=review`;
  const activateHref = `/${lang}/specialist/dashboard/activate`;

  return (
    <div className="space-y-freuly-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-freuly-page-title text-freuly-text-primary">{copy.title}</h1>
        <p className="text-freuly-page-subtitle text-freuly-text-secondary">{copy.subtitle}</p>
      </header>

      <Card className={ready ? "border-freuly-primary/25 bg-freuly-primary-light/30" : undefined}>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-freuly-2">
            <Badge variant={ready ? "success" : "neutral"}>
              {ready ? copy.readyBadge : copy.draftBadge}
            </Badge>
            <Badge variant="neutral">{copy.channelOff}</Badge>
          </div>
          <CardTitle className="mt-freuly-4">
            {ready ? copy.readyTitle : copy.draftTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-3xl text-freuly-body leading-relaxed text-freuly-text-secondary">
            {ready ? copy.readyBody : copy.draftBody}
          </p>
        </CardContent>
        <CardFooter>
          {ready ? (
            <>
              <Link href={activateHref} className={dashboardLinkPrimaryClass}>
                {copy.activate}
              </Link>
              <Link href={reviewHref} className={dashboardLinkSecondaryClass}>
                {copy.editLater}
              </Link>
            </>
          ) : (
            <Link href={onboardingHref} className={dashboardLinkPrimaryClass}>
              {copy.continueSetup}
            </Link>
          )}
        </CardFooter>
      </Card>

      <Alert variant="info" title={copy.visibilityTitle}>
        {copy.visibilityBody}
      </Alert>
    </div>
  );
}
