import { notificationLocale } from "@/lib/inbox/policy";

type Phrase = {
  interestedOne: string;
  interestedMany: string;
  connection: string;
  selectedYou: string;
  reminder: string;
  systemConnected: string;
  view: string;
  openDialog: string;
};

const PHRASES: Record<string, Phrase> = {
  ru: {
    interestedOne: "Специалист готов помочь",
    interestedMany: "На вашу заявку откликнулись специалисты",
    connection: "Вы выбрали специалиста. Теперь можно общаться во Freuly.",
    selectedYou: "Клиент выбрал вас",
    reminder: "На вашу заявку уже откликнулись специалисты.",
    systemConnected: "Freuly соединил вас по заявке",
    view: "Посмотреть",
    openDialog: "Открыть диалог",
  },
  ua: {
    interestedOne: "Спеціаліст готовий допомогти",
    interestedMany: "На вашу заявку відгукнулися спеціалісти",
    connection: "Ви обрали спеціаліста. Тепер можна спілкуватися у Freuly.",
    selectedYou: "Клієнт обрав вас",
    reminder: "На вашу заявку вже відгукнулися спеціалісти.",
    systemConnected: "Freuly з’єднав вас за заявкою",
    view: "Переглянути",
    openDialog: "Відкрити діалог",
  },
  de: {
    interestedOne: "Eine Fachkraft kann helfen",
    interestedMany: "Auf Ihre Anfrage haben sich Fachkräfte gemeldet",
    connection: "Sie haben eine Fachkraft gewählt. Sie können jetzt in Freuly schreiben.",
    selectedYou: "Der Kunde hat Sie ausgewählt",
    reminder: "Auf Ihre Anfrage haben sich bereits Fachkräfte gemeldet.",
    systemConnected: "Freuly hat Sie zu dieser Anfrage verbunden",
    view: "Ansehen",
    openDialog: "Dialog öffnen",
  },
};

const FALLBACK: Phrase = {
  interestedOne: "A specialist can help",
  interestedMany: "Specialists responded to your request",
  connection: "You chose a specialist. You can now talk in Freuly.",
  selectedYou: "The client chose you",
  reminder: "Specialists have already responded to your request.",
  systemConnected: "Freuly connected you about this request",
  view: "View",
  openDialog: "Open conversation",
};

function phrasesFor(locale: string): Phrase {
  return PHRASES[notificationLocale(locale)] ?? FALLBACK;
}

export function renderClientEvent(
  locale: string,
  event: "specialist_interested" | "connection_ready" | "client_reminder" | "client_selected_you",
  input: { count?: number; serviceLabel?: string | null },
): { title: string; body: string; action: string } {
  const phrase = phrasesFor(locale);
  const label = input.serviceLabel?.trim() || "";
  if (event === "client_selected_you") {
    return { title: phrase.selectedYou, body: label, action: phrase.openDialog };
  }
  if (event === "connection_ready") {
    return { title: phrase.connection, body: label, action: phrase.openDialog };
  }
  if (event === "client_reminder") {
    return { title: phrase.reminder, body: label, action: phrase.view };
  }
  const many = (input.count ?? 1) > 1;
  return {
    title: many ? phrase.interestedMany : phrase.interestedOne,
    body: label,
    action: phrase.view,
  };
}

export function renderSystemConnection(locale: string, serviceLabel: string | null): string {
  const phrase = phrasesFor(locale);
  const label = serviceLabel?.trim();
  return label ? `${phrase.systemConnected} “${label}”.` : `${phrase.systemConnected}.`;
}
