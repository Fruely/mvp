import assert from "node:assert/strict";
import test from "node:test";

import { getDemandChannelCopy } from "../dashboard/demandChannelCopy.ts";
import { applyCommercialCopyOverrides } from "../i18nCommercialOverrides.ts";
import { applyCommercialCopyOverridesV2 } from "../i18nCommercialOverridesV2.ts";
import { applyCommercialFlatOverrides } from "../i18nCommercialFlatOverrides.ts";
import { applyCommercialFinalOverrides } from "../i18nCommercialFinalOverrides.ts";
import { t, type Lang } from "../i18n.ts";
import {
  dashboardNoticeTitleBody,
  leadsBannerSeverity,
  leadsSubscriptionBannerText,
} from "../specialists/subscriptionDisplay.ts";

const BANNED = [
  "Коммерческое участие в канале заявок не активно",
  "Подключите тариф, чтобы получать новые подходящие запросы",
  "чтобы получать новые подходящие запросы",
  "Канал заявок не активирован",
  "скрыт из каталога",
  "не участвует в получении клиентских заявок",
  "Anfragekanal nicht aktiviert",
];

const LANGS: Lang[] = ["ru", "ua", "de"];

function commercialDict(lang: Lang) {
  const nested = applyCommercialCopyOverrides(lang, {});
  const v2 = applyCommercialCopyOverridesV2(lang, nested);
  const flat = applyCommercialFlatOverrides(lang, v2);
  return applyCommercialFinalOverrides(lang, flat);
}

test("inactive specialist copy means no covering subscription, not exclusion from leads", () => {
  for (const lang of LANGS) {
    const dict = commercialDict(lang);
    const leadsInactive = t(dict, "dashboard.subscriptionNotice.leadsInactive");
    const inactiveBody = t(dict, "dashboard.subscriptionNotice.inactiveBody");
    const inactiveNotice = t(dict, "dashboard.billingPage.inactiveNotice");
    const unlockRequiresPlan = t(dict, "dashboard.leads.unlockRequiresPlan");
    const demand = getDemandChannelCopy(lang);

    const surfaces = [
      leadsInactive,
      inactiveBody,
      inactiveNotice,
      unlockRequiresPlan,
      demand.onboarding.draftUntilPaid,
      demand.onboarding.reviewBody,
      demand.onboarding.reviewReadyBody,
      demand.billing.subtitle,
      demand.billing.draftNotice,
    ];

    for (const text of surfaces) {
      for (const banned of BANNED) {
        assert.equal(
          text.includes(banned),
          false,
          `${lang}: banned phrase in copy: ${banned}\n${text}`,
        );
      }
    }

    assert.match(leadsInactive, lang === "de" ? /ohne Abo/i : /без підписк|без подписк/i);
    assert.match(leadsInactive, lang === "de" ? /einzeln/i : /окрем|отдельн/i);
    assert.match(unlockRequiresPlan, lang === "de" ? /einzeln|Tarifs/i : /окрем|отдельн|тариф/i);
  }
});

test("inactive dashboard and leads notices are informational, not a blocked-channel error", () => {
  const display = {
    planCode: "starter",
    status: "inactive",
    phase: "inactive" as const,
    severity: "info" as const,
    daysUntilExpires: null,
    daysUntilGraceEnds: null,
    isExpiringSoon: false,
    isInGracePeriod: false,
    isExpired: false,
    shouldShowDashboardNotice: true,
    shouldShowLeadsNotice: true,
  };

  assert.equal(leadsBannerSeverity(display), "info");
  assert.equal(dashboardNoticeTitleBody({}, { kind: "inactive" }).severity, "info");
  assert.equal(
    leadsSubscriptionBannerText(
      { "dashboard.subscriptionNotice.leadsInactive": "working without a subscription" },
      display,
    ),
    "working without a subscription",
  );
});
