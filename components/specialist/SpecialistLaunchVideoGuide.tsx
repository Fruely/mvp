"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";

const COLLAPSED_STORAGE_KEY = "freuly_specialist_launch_video_guide_collapsed";
const VIDEO_EMBED_URL = "https://www.youtube.com/embed/2eEnzEFqMEg";

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
  openFullGuide: string;
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
      openFullGuide: "Відкрити повний відеогід",
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
      openFullGuide: "Vollstandigen Videoguide offnen",
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
    openFullGuide: "Открыть полный видеогид",
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
          <Card padding="sm" className="shadow-md">
            <p className="text-freuly-label text-freuly-text-primary">{copy.title}</p>
            <p className="mt-freuly-2 text-freuly-body-sm leading-relaxed text-freuly-text-secondary">
              {copy.description}
            </p>

            {opened ? (
              <div className="mt-freuly-3 overflow-hidden rounded-freuly-md border border-freuly-border-default bg-black">
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

            <div className="mt-freuly-4 flex flex-wrap gap-freuly-2">
              {!opened ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={openGuide}
                  className="min-h-[36px] h-9 px-freuly-3 py-1.5 text-freuly-body-sm"
                >
                  {copy.watch}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={handleCollapse}
                className="min-h-[36px] h-9 px-freuly-3 py-1.5 text-freuly-body-sm"
              >
                {copy.collapse}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleSnooze}
                className="min-h-[36px] h-9 px-freuly-3 py-1.5 text-freuly-body-sm"
              >
                {copy.snooze}
              </Button>
            </div>
            <Link
              href={`/${lang}/specialist/dashboard/video-guide`}
              className="mt-freuly-3 inline-flex text-freuly-body-sm font-medium text-freuly-primary transition hover:text-freuly-primary-hover"
            >
              {copy.openFullGuide}
            </Link>
          </Card>
        </div>
      ) : null}

      {showFloatingButton ? (
        <Button
          type="button"
          variant="secondary"
          onClick={openGuide}
          className="fixed bottom-4 right-4 z-40 min-h-[40px] rounded-full px-freuly-4 py-freuly-2 shadow-md sm:bottom-6 sm:right-6"
        >
          <span aria-hidden="true">🎥</span>
          <span>{copy.videoGuide}</span>
        </Button>
      ) : null}
    </>
  );
}
