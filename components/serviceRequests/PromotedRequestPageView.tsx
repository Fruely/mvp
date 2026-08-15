import Link from "next/link";
import PromotedAccessCheckoutButton from "@/components/billing/PromotedAccessCheckoutButton";
import { t, type Dictionary, type Lang } from "@/lib/i18n";
import type { PromotedPaymentDisplayState } from "@/lib/serviceRequests/promotedRequestAccess";
import type { PromotedRequestPageModel } from "@/lib/serviceRequests/promotedRequestPageData";

function paymentStateLabel(dict: Dictionary, state: PromotedPaymentDisplayState): string | null {
  if (state === "none") return null;
  const key = `dashboard.promotedRequestPage.paymentState.${state}`;
  const translated = t(dict, key);
  return translated !== key ? translated : null;
}

function urgencyLabel(dict: Dictionary, urgency: string): string {
  const key = `dashboard.promotedRequestPage.urgency.${urgency}`;
  const translated = t(dict, key);
  return translated !== key ? translated : urgency;
}

type Props = {
  model: PromotedRequestPageModel;
  lang: Lang;
  dict: Dictionary;
};

export default function PromotedRequestPageView({ model, lang, dict }: Props) {
  if (model.view === "unavailable") {
    return (
      <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          {t(dict, "dashboard.promotedRequestPage.title")}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-600">
          {t(dict, "dashboard.promotedRequestPage.unavailable")}
        </p>
      </section>
    );
  }

  if (model.view === "unlocked") {
    const { details } = model;
    const locationParts = [details.city, details.postal_code].filter(Boolean);

    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/90">
            {t(dict, "dashboard.promotedRequestPage.unlocked.kicker")}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
            {model.publicTitle}
          </h1>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {model.publicSummary}
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-semibold text-gray-900">
            {t(dict, "dashboard.promotedRequestPage.contacts.title")}
          </h2>
          <dl className="mt-4 space-y-3 text-sm text-gray-700">
            <div>
              <dt className="font-medium text-gray-900">
                {t(dict, "dashboard.promotedRequestPage.contacts.name")}
              </dt>
              <dd>{details.client_name}</dd>
            </div>
            {details.client_email ? (
              <div>
                <dt className="font-medium text-gray-900">
                  {t(dict, "dashboard.promotedRequestPage.contacts.email")}
                </dt>
                <dd>
                  <a
                    href={`mailto:${details.client_email}`}
                    className="text-indigo-700 underline-offset-4 hover:underline"
                  >
                    {details.client_email}
                  </a>
                </dd>
              </div>
            ) : null}
            {details.client_phone ? (
              <div>
                <dt className="font-medium text-gray-900">
                  {t(dict, "dashboard.promotedRequestPage.contacts.phone")}
                </dt>
                <dd>
                  <a
                    href={`tel:${details.client_phone}`}
                    className="text-indigo-700 underline-offset-4 hover:underline"
                  >
                    {details.client_phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {!details.client_email && !details.client_phone ? (
              <p className="text-gray-600">
                {t(dict, "dashboard.promotedRequestPage.contacts.missing")}
              </p>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-base font-semibold text-gray-900">
            {t(dict, "dashboard.promotedRequestPage.details.title")}
          </h2>
          <dl className="mt-4 space-y-3 text-sm text-gray-700">
            <div>
              <dt className="font-medium text-gray-900">
                {t(dict, "dashboard.promotedRequestPage.details.description")}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">{details.description}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-900">
                {t(dict, "dashboard.promotedRequestPage.details.urgency")}
              </dt>
              <dd>{details.when_label ?? urgencyLabel(dict, details.urgency)}</dd>
            </div>
            {locationParts.length > 0 ? (
              <div>
                <dt className="font-medium text-gray-900">
                  {t(dict, "dashboard.promotedRequestPage.details.location")}
                </dt>
                <dd>{locationParts.join(", ")}</dd>
              </div>
            ) : null}
            {details.work_format ? (
              <div>
                <dt className="font-medium text-gray-900">
                  {t(dict, "dashboard.promotedRequestPage.details.workFormat")}
                </dt>
                <dd>{details.work_format}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>
    );
  }

  const isClosed = model.view === "closed_locked";
  const isProcessing = model.view === "processing";
  const paymentLabel = paymentStateLabel(dict, model.paymentState);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600/90">
          {t(dict, "dashboard.promotedRequestPage.locked.kicker")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900">
          {model.publicTitle}
        </h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {model.publicSummary}
        </p>
        {isClosed ? (
          <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
            {t(dict, "dashboard.promotedRequestPage.closedNotice")}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-indigo-100/90 bg-indigo-50/30 p-6 shadow-sm sm:p-8">
        <h2 className="text-base font-semibold text-gray-900">
          {t(dict, "dashboard.promotedRequestPage.paywall.title")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          {t(dict, "dashboard.promotedRequestPage.paywall.body")}
        </p>
        <p className="mt-3 text-sm font-semibold text-gray-900">
          {t(dict, "dashboard.promotedRequestPage.paywall.price")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {t(dict, "dashboard.promotedRequestPage.paywall.creditHint")}
        </p>
        {isProcessing ? (
          <p className="mt-4 rounded-xl border border-indigo-100 bg-white px-4 py-3 text-sm text-gray-700">
            {t(dict, "dashboard.promotedRequestPage.paymentState.processing")}
          </p>
        ) : paymentLabel ? (
          <p className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            {paymentLabel}
          </p>
        ) : null}
        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          {t(dict, "dashboard.promotedRequestPage.paywall.webhookDisclaimer")}
        </p>
        {model.showPayCta ? (
          <div className="mt-6">
            <PromotedAccessCheckoutButton lang={lang} dict={dict} />
          </div>
        ) : null}
      </section>

      <p className="text-sm">
        <Link
          href={`/${lang}/specialist/dashboard`}
          className="font-medium text-indigo-700 underline-offset-4 hover:underline"
        >
          {t(dict, "dashboard.promotedRequestPage.backToDashboard")}
        </Link>
      </p>
    </div>
  );
}
