import type {
  ServiceIntentFieldCode,
  ServiceIntentLocale,
  ServiceIntentQuestion,
} from "./contract";
import type { ServiceIntentModelQuestion } from "./modelResponse";

/**
 * At most one clarifying question reaches the screen, and code — not the model —
 * decides which one. Name, email and phone are never asked here: they belong to
 * the later confirmation step.
 */

/**
 * Asked in this order; the first still-missing field wins. "Where or online"
 * is two codes because the answer differs: the format question resolves whether
 * a place matters at all, the location question resolves which place.
 */
export const QUESTION_PRIORITY: readonly ServiceIntentFieldCode[] = [
  "requested_service",
  "work_format",
  "location",
  "timing",
  "preferred_language",
  "service_detail",
];

type QuestionCopy = {
  text: string;
  options: string[];
  allowNoPreference: boolean;
};

const FALLBACK_COPY: Record<
  ServiceIntentFieldCode,
  Record<ServiceIntentLocale, QuestionCopy>
> = {
  requested_service: {
    ru: { text: "Что именно нужно сделать?", options: [], allowNoPreference: false },
    ua: { text: "Що саме потрібно зробити?", options: [], allowNoPreference: false },
    de: { text: "Was genau soll erledigt werden?", options: [], allowNoPreference: false },
  },
  work_format: {
    ru: {
      text: "Нужно на месте или можно онлайн?",
      options: ["На месте", "Онлайн"],
      allowNoPreference: true,
    },
    ua: {
      text: "Потрібно на місці або можна онлайн?",
      options: ["На місці", "Онлайн"],
      allowNoPreference: true,
    },
    de: {
      text: "Vor Ort oder online?",
      options: ["Vor Ort", "Online"],
      allowNoPreference: true,
    },
  },
  location: {
    ru: { text: "В каком городе или районе?", options: [], allowNoPreference: true },
    ua: { text: "У якому місті або районі?", options: [], allowNoPreference: true },
    de: { text: "In welcher Stadt oder Gegend?", options: [], allowNoPreference: true },
  },
  timing: {
    ru: { text: "Когда это нужно?", options: [], allowNoPreference: true },
    ua: { text: "Коли це потрібно?", options: [], allowNoPreference: true },
    de: { text: "Wann brauchen Sie das?", options: [], allowNoPreference: true },
  },
  preferred_language: {
    ru: {
      text: "На каком языке удобнее общаться?",
      options: ["Русский", "Українська", "Deutsch"],
      allowNoPreference: true,
    },
    ua: {
      text: "Якою мовою вам зручніше спілкуватися?",
      options: ["Українська", "Русский", "Deutsch"],
      allowNoPreference: true,
    },
    de: {
      text: "In welcher Sprache möchten Sie kommunizieren?",
      options: ["Deutsch", "Russisch", "Ukrainisch"],
      allowNoPreference: true,
    },
  },
  service_detail: {
    ru: { text: "Есть ли важная деталь, о которой стоит знать?", options: [], allowNoPreference: true },
    ua: { text: "Чи є важлива деталь, про яку варто знати?", options: [], allowNoPreference: true },
    de: { text: "Gibt es ein wichtiges Detail, das wir wissen sollten?", options: [], allowNoPreference: true },
  },
};

export type SelectNextQuestionOptions = {
  locale: ServiceIntentLocale;
  /** Fields code still considers missing, in any order. */
  missingFields: readonly ServiceIntentFieldCode[];
  /** Already settled by the person, including an explicit "no preference". */
  resolvedFields: readonly ServiceIntentFieldCode[];
  /** The model's suggestion; used for its wording only, never for the decision. */
  modelQuestion: ServiceIntentModelQuestion | null;
};

/**
 * Picks zero or one question. A field the person already settled is never asked
 * again, so answering "no preference" cannot loop.
 */
export function selectNextQuestion(
  options: SelectNextQuestionOptions,
): ServiceIntentQuestion | null {
  const candidate = QUESTION_PRIORITY.find(
    (code) => options.missingFields.includes(code) && !options.resolvedFields.includes(code),
  );
  if (!candidate) return null;

  const fallback = FALLBACK_COPY[candidate][options.locale];
  const model = options.modelQuestion;
  const wording = model && model.field_code === candidate ? model : null;

  return {
    field_code: candidate,
    text: wording?.text ?? fallback.text,
    options: wording && wording.options.length > 0 ? wording.options : fallback.options,
    allow_no_preference: wording
      ? wording.allow_no_preference || fallback.allowNoPreference
      : fallback.allowNoPreference,
  };
}
