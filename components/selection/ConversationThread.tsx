import type { Lang } from "@/lib/i18n";
import { renderSystemConnection } from "@/lib/selection/render";
import type { ConversationMessageView } from "@/lib/selection/view";
import ConversationComposer from "./ConversationComposer";

const COPY: Record<Lang, { title: string; placeholder: string; send: string; error: string }> = {
  ru: {
    title: "Диалог",
    placeholder: "Напишите сообщение",
    send: "Отправить",
    error: "Не удалось отправить сообщение.",
  },
  ua: {
    title: "Діалог",
    placeholder: "Напишіть повідомлення",
    send: "Надіслати",
    error: "Не вдалося надіслати повідомлення.",
  },
  de: {
    title: "Dialog",
    placeholder: "Nachricht schreiben",
    send: "Senden",
    error: "Die Nachricht konnte nicht gesendet werden.",
  },
};

export default function ConversationThread({
  lang,
  conversationId,
  messages,
}: {
  lang: Lang;
  conversationId: string;
  messages: ConversationMessageView[];
}) {
  const copy = COPY[lang];
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
      <div className="mt-4 space-y-3">
        {messages.map((message) => (
          <article key={message.id} className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
            {message.kind === "system"
              ? renderSystemConnection(lang, message.serviceLabel)
              : message.body}
          </article>
        ))}
      </div>
      <ConversationComposer
        conversationId={conversationId}
        placeholder={copy.placeholder}
        sendLabel={copy.send}
        errorLabel={copy.error}
      />
    </main>
  );
}
