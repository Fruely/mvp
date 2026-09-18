import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildTelegramChannelReplyMarkup,
  normalizeTelegramChannelCta,
} from "./channelPosts.ts";

test("normalizes a valid Telegram channel CTA", () => {
  assert.deepEqual(
    normalizeTelegramChannelCta(
      "  Найти специалиста бесплатно  ",
      " https://freuly.de/ru/request?utm_source=telegram "
    ),
    {
      label: "Найти специалиста бесплатно",
      url: "https://freuly.de/ru/request?utm_source=telegram",
    }
  );
});

test("rejects invalid or unsafe Telegram channel CTA values", () => {
  assert.equal(normalizeTelegramChannelCta("", "https://freuly.de"), null);
  assert.equal(normalizeTelegramChannelCta("Заявка", "javascript:alert(1)"), null);
  assert.equal(normalizeTelegramChannelCta("Заявка", "freuly.de"), null);
  assert.equal(normalizeTelegramChannelCta("x".repeat(65), "https://freuly.de"), null);
});

test("builds a URL inline keyboard directly below the post", () => {
  assert.deepEqual(
    buildTelegramChannelReplyMarkup({
      label: "Найти специалиста бесплатно",
      url: "https://freuly.de/ru/request",
    }),
    {
      inline_keyboard: [
        [
          {
            text: "Найти специалиста бесплатно",
            url: "https://freuly.de/ru/request",
          },
        ],
      ],
    }
  );
  assert.equal(buildTelegramChannelReplyMarkup(null), undefined);
});

test("manual and scheduled publishers both forward stored CTA fields", () => {
  const root = process.cwd();
  const manualRoute = fs.readFileSync(
    path.join(root, "app/api/admin/telegram/channel-posts/[id]/publish/route.ts"),
    "utf8"
  );
  const cronRoute = fs.readFileSync(
    path.join(root, "app/api/cron/publish-telegram-posts/route.ts"),
    "utf8"
  );

  for (const source of [manualRoute, cronRoute]) {
    assert.match(source, /cta_label/);
    assert.match(source, /cta_url/);
    assert.match(source, /normalizeTelegramChannelCta/);
    assert.match(source, /sendTelegramChannelPost\(String\(post\.body_text \?\? ""\), cta\)/);
  }
});
