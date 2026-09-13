type GenerateTelegramChannelPostInput = {
  topic?: string | null;
  context?: string | null;
};

type GenerateTelegramChannelPostResult =
  | { ok: true; title: string; body_text: string }
  | { ok: false; status: number; error: string };

const DEFAULT_MODEL = "gpt-5.6-luna";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const response = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: unknown;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") return response.output_text;

  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => (typeof content.text === "string" ? content.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseGeneratedPost(outputText: string): { title: string; body_text: string } {
  try {
    const parsed = JSON.parse(outputText) as Record<string, unknown>;
    const title = cleanText(parsed.title, 160) || "Сгенерированный пост";
    const bodyText = cleanText(parsed.body_text, 4096);

    if (bodyText) return { title, body_text: bodyText };
  } catch {
    // Fall back to plain text when the provider returns non-JSON text.
  }

  return {
    title: "Сгенерированный пост",
    body_text: cleanText(outputText, 4096),
  };
}

function buildGenerationPrompt({ topic, context }: GenerateTelegramChannelPostInput): string {
  const topicText = cleanText(topic, 180) || "упаковка страницы специалиста";
  const contextText = cleanText(context, 1200);

  return [
    "Сгенерируй один Telegram-пост для канала Freuly о маркетинге и продажах услуг в Германии.",
    "",
    `Тема: ${topicText}`,
    contextText ? `Дополнительный контекст от админа: ${contextText}` : "",
    "",
    "Аудитория: специалисты, эксперты и микробизнес в Германии, которые продают услуги: психологи, коучи, консультанты, репетиторы, мастера, преподаватели, локальные и онлайн-услуги.",
    "Язык: русский.",
    "Тон: экспертный, спокойный, практичный, без хайпа и обещаний быстрых результатов.",
    "Формат: проблема -> как проверить -> как исправить -> мини-задание.",
    "Продажа: прямую продажу не добавлять. Можно мягко подвести к мысли, что сначала стоит улучшить упаковку.",
    "Не упоминай Freuly как главную тему поста. Можно упомянуть только если это естественно, но лучше не нужно.",
    "Не используй эмодзи.",
    "Длина: 1200-2200 знаков.",
    "",
    "Верни только валидный JSON без markdown:",
    '{"title":"короткий внутренний заголовок","body_text":"готовый текст поста"}',
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateTelegramChannelPost(
  input: GenerateTelegramChannelPostInput
): Promise<GenerateTelegramChannelPostResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: "OPENAI_API_KEY is not configured",
    };
  }

  const model = process.env.TELEGRAM_POST_AI_MODEL || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: buildGenerationPrompt(input),
        max_output_tokens: 1200,
      }),
    });
  } catch (error) {
    console.error("[telegram/channel-posts/generate] OpenAI request failed", error);
    return { ok: false, status: 502, error: "Failed to reach OpenAI API" };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiError =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error?: { message?: unknown } }).error?.message === "string"
        ? (payload as { error: { message: string } }).error.message
        : "OpenAI API returned an error";

    console.error("[telegram/channel-posts/generate] OpenAI error", {
      status: response.status,
      error: apiError,
    });
    return { ok: false, status: 502, error: "Failed to generate Telegram post" };
  }

  const outputText = extractOutputText(payload);
  const post = parseGeneratedPost(outputText);

  if (!post.body_text) {
    return { ok: false, status: 502, error: "OpenAI returned an empty post" };
  }

  return { ok: true, ...post };
}
