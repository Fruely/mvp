import Link from "next/link";
import { Alert, Badge, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui";
import {
  dashboardLinkPrimaryClass,
  dashboardLinkSecondaryClass,
} from "@/components/dashboard/dashboardStyles";
import type { SpecialistRow } from "@/lib/specialists/server";
import { getSpecialistOnboardingGateState } from "@/lib/specialists/server";
import { getDemandChannelCopy } from "@/lib/dashboard/demandChannelCopy";
import PublishWithoutSubscriptionButton from "@/components/dashboard/onboarding/PublishWithoutSubscriptionButton";

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
    subtitle: "Здесь видно, готов ли профиль к публикации. Подписка не обязательна для участия в канале заявок.",
    draftBadge: "Черновик",
    readyBadge: "Готов к публикации",
    channelOff: "Профиль не опубликован",
    draftTitle: "Завершите настройку",
    draftBody: "Профиль сохранён как черновик и не виден клиентам. Заполните обязательные параметры, чтобы подготовить его к публикации.",
    readyTitle: "Профиль готов — публикация не требует подписки",
    readyBody: "Параметры для подбора заявок настроены. После публикации подходящие заявки можно покупать отдельно. Professional или Growth дают доступ к заявкам в рамках тарифа.",
    visibilityTitle: "Что происходит сейчас",
    visibilityBody: "Профиль ещё не опубликован, поэтому не показывается клиентам и не участвует в распределении заявок. Публикация не требует оплаты тарифа.",
    continueSetup: "Продолжить настройку",
    activate: "Перейти к тарифам",
    editLater: "Вернуться к настройке",
  },
  ua: {
    title: "Ваш канал клієнтських заявок",
    subtitle: "Тут видно, чи готовий профіль до публікації. Підписка не обов’язкова для участі в каналі заявок.",
    draftBadge: "Чернетка",
    readyBadge: "Готовий до публікації",
    channelOff: "Профіль не опубліковано",
    draftTitle: "Завершіть налаштування",
    draftBody: "Профіль збережено як чернетку й він не видимий клієнтам. Заповніть обов’язкові параметри, щоб підготувати його до публікації.",
    readyTitle: "Профіль готовий — публікація не потребує підписки",
    readyBody: "Параметри для підбору заявок налаштовані. Після публікації відповідні запити можна купувати окремо. Professional або Growth дають доступ до запитів у межах тарифу.",
    visibilityTitle: "Що відбувається зараз",
    visibilityBody: "Профіль ще не опубліковано, тому він не показується клієнтам і не бере участі в розподілі заявок. Публікація не потребує оплати тарифу.",
    continueSetup: "Продовжити налаштування",
    activate: "Перейти до тарифів",
    editLater: "Повернутися до налаштування",
  },
  de: {
    title: "Ihr Kanal für Kundenanfragen",
    subtitle: "Hier sehen Sie, ob Ihr Profil zur Veröffentlichung bereit ist. Ein Abo ist keine Voraussetzung für die Teilnahme am Anfragekanal.",
    draftBadge: "Entwurf",
    readyBadge: "Bereit zur Veröffentlichung",
    channelOff: "Profil nicht veröffentlicht",
    draftTitle: "Einrichtung abschließen",
    draftBody: "Ihr Profil ist als Entwurf gespeichert und für Kunden nicht sichtbar. Vervollständigen Sie die Pflichtangaben, um es für die Veröffentlichung vorzubereiten.",
    readyTitle: "Profil bereit — Veröffentlichung ohne Abo möglich",
    readyBody: "Die Matching-Angaben sind eingerichtet. Nach der Veröffentlichung können passende Anfragen einzeln gekauft werden. Professional oder Growth geben Zugang zu Anfragen im Rahmen des Tarifs.",
    visibilityTitle: "Aktueller Status",
    visibilityBody: "Das Profil ist noch nicht veröffentlicht, daher für Kunden unsichtbar und nimmt nicht an der Verteilung von Anfragen teil. Die Veröffentlichung erfordert keine Tarifzahlung.",
    continueSetup: "Einrichtung fortsetzen",
    activate: "Zu den Tarifen",
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
  const demandCopy = getDemandChannelCopy(lang);
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
              <PublishWithoutSubscriptionButton
                lang={lang}
                enabled={ready}
                publishLabel={demandCopy.onboarding.publishWithoutSubscription}
                publishingLabel={demandCopy.onboarding.publishingWithoutSubscription}
                errorLabel={demandCopy.onboarding.publishFailed}
              />
              <Link href={activateHref} className={dashboardLinkSecondaryClass}>
                {demandCopy.onboarding.connectSubscription}
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
