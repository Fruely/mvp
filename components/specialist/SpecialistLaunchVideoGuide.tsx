"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const COLLAPSED_STORAGE_KEY = "freuly_specialist_launch_video_guide_collapsed";
const VIDEO_EMBED_URL = "https://www.youtube.com/embed/VIDEO_ID";

type Props = {
  lang: string;
  initialAutoShow: boolean;
};

type Copy = {
  title: string;
  description: string;
  watch: string;
  collapse: string;
  snooze: string;
  videoGuide: string;
};

function getCopy(lang: string): Copy {
  if (lang === "ua") {
    return {
      title: "Помічник із запуску профілю",
      description:
        "Перегляньте відеогід: як заповнити профіль, додати послуги, галерею та опублікуватися на Freuly.",
      watch: "Дивитися гід",
      collapse: "Згорнути",
      snooze: "Нагадати пізніше",
      videoGuide: "Відеогід",
    };
  }
  if (lang === "de") {
    return {
      title: "Assistent zum Profilstart",
      description:
        "Sehen Sie sich den Videoguide an: Profil ausfüllen, Leistungen und Galerie hinzufügen und das Profil auf Freuly veröffentlichen.",
      watch: "Guide ansehen",
      collapse: "Minimieren",
      snooze: "Spater erinnern",
      videoGuide: "Videoguide",
    };
  }
  return {
    title: "Помощник по запуску профиля",
    description:
      "Посмотрите видеогид: как заполнить профиль, добавить услуги, галерею и опубликоваться на Freuly.",
    watch: "Смотреть гайд",
    collapse: "Свернуть",
    snooze: "Напомнить позже",
    videoGuide: "Видеогид",
  };
}

async function sendGuideAction(action: "opened" | "watched" | "snoozed") {
  try {
    await fetch("/api/specialist/onboarding-video-guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
      credentials: "include",
    });
  } catch {
    // Best-effort analytics update; UI should remain responsive if request fails.
  }
}

export default function SpecialistLaunchVideoGuide({
  lang,
  initialAutoShow,
}: Props) {
  const copy = useMemo(() => getCopy(lang), [lang]);
  const [collapsed, setCollapsed] = useState(false);
  const [opened, setOpened] = useState(false);
  const [dismissedBySnooze, setDismissedBySnooze] = useState(!initialAutoShow);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    setCollapsed(storedValue === "1");
  }, []);

  const showCard = !dismissedBySnooze && !collapsed;
  const showFloatingButton = dismissedBySnooze || collapsed;

  const openGuide = useCallback(() => {
    setDismissedBySnooze(false);
    setCollapsed(false);
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, "0");
    if (!opened) {
      void sendGuideAction("opened");
    }
    setOpened(true);
  }, [opened]);

  const handleCollapse = useCallback(() => {
    setCollapsed(true);
    setOpened(false);
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, "1");
  }, []);

  const handleSnooze = useCallback(() => {
    setDismissedBySnooze(true);
    setOpened(false);
    void sendGuideAction("snoozed");
  }, []);

  return (
    <>
      {showCard ? (
        <div className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
            <p className="text-sm font-semibold text-gray-900">{copy.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{copy.description}</p>

            {opened ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-black">
                <iframe
                  src={VIDEO_EMBED_URL}
                  title={copy.videoGuide}
                  className="h-[190px] w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {!opened ? (
                <button
                  type="button"
                  onClick={openGuide}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {copy.watch}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleCollapse}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {copy.collapse}
              </button>
              <button
                type="button"
                onClick={handleSnooze}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {copy.snooze}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showFloatingButton ? (
        <button
          type="button"
          onClick={openGuide}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-[0_10px_28px_rgba(15,23,42,0.14)] transition hover:bg-gray-50 sm:bottom-6 sm:right-6"
        >
          <span aria-hidden="true">🎥</span>
          <span>{copy.videoGuide}</span>
        </button>
      ) : null}
    </>
  );
}
