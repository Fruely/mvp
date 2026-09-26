import { notificationLocale } from "./policy";

export type InboxNotice = {
  stage: "initial" | "reminder" | "final";
  opened: boolean;
  serviceLabel: string;
  workFormat: string | null;
  city: string | null;
  serviceLanguages: readonly string[];
};

type Phrase = {
  titleInitial: string;
  titleReminder: string;
  titleFinal: string;
  titleOpened: string;
  interested: string;
  declined: string;
  view: string;
};

const PHRASES: Record<string, Phrase> = {
  ru: {
    titleInitial: "Новая подходящая заявка",
    titleReminder: "Заявка всё ещё ждёт ответа",
    titleFinal: "Последнее напоминание о заявке",
    titleOpened: "Вы открывали заявку, ответа пока нет",
    interested: "Готов помочь",
    declined: "Не подходит",
    view: "Посмотреть заявку",
  },
  ua: {
    titleInitial: "Нова відповідна заявка",
    titleReminder: "Заявка все ще чекає на відповідь",
    titleFinal: "Останнє нагадування про заявку",
    titleOpened: "Ви відкривали заявку, відповіді ще немає",
    interested: "Готовий допомогти",
    declined: "Не підходить",
    view: "Переглянути заявку",
  },
  de: {
    titleInitial: "Neue passende Anfrage",
    titleReminder: "Die Anfrage wartet noch auf eine Antwort",
    titleFinal: "Letzte Erinnerung zur Anfrage",
    titleOpened: "Sie haben die Anfrage geöffnet, eine Antwort fehlt noch",
    interested: "Ich kann helfen",
    declined: "Passt nicht",
    view: "Anfrage ansehen",
  },
};

const FALLBACK: Phrase = {
  titleInitial: "New matching request",
  titleReminder: "A request is still waiting",
  titleFinal: "Final reminder about a request",
  titleOpened: "You opened a request and have not answered yet",
  interested: "I can help",
  declined: "Not a fit",
  view: "View request",
};

function phrasesFor(locale: string): Phrase {
  return PHRASES[notificationLocale(locale)] ?? FALLBACK;
}

export function renderMatchNotice(locale: string, notice: InboxNotice): { title: string; body: string } {
  const phrase = phrasesFor(locale);
  const title =
    notice.stage === "final"
      ? phrase.titleFinal
      : notice.stage === "reminder"
        ? notice.opened
          ? phrase.titleOpened
          : phrase.titleReminder
        : phrase.titleInitial;
  const bits = [notice.serviceLabel, notice.workFormat, notice.city, notice.serviceLanguages.join(", ")]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return { title, body: bits.join(" · ") };
}

export function renderActions(locale: string): { interested: string; declined: string; view: string } {
  const phrase = phrasesFor(locale);
  return { interested: phrase.interested, declined: phrase.declined, view: phrase.view };
}
