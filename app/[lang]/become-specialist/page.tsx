import type { Metadata } from "next";
import BecomeSpecialistClientPage from "./BecomeSpecialistClientPage";

const DOMAIN = "https://freuly.de";

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const byLang = {
    ua: {
      title: "Стати спеціалістом | Приєднуйтесь до платформи",
      description:
        "Сторінка для реєстрації спеціалістів: подайте заявку, додайте профіль і почніть отримувати звернення від клієнтів у Німеччині.",
    },
    ru: {
      title: "Стать специалистом | Присоединяйтесь к платформе",
      description:
        "Страница регистрации специалистов: отправьте заявку, создайте профиль и начните получать обращения от клиентов в Германии.",
    },
    de: {
      title: "Spezialist werden | Der Plattform beitreten",
      description:
        "Registrierung für Fachkräfte: Bewerben Sie sich, erstellen Sie ein Profil und erhalten Sie Anfragen von Kunden in Deutschland.",
    },
  } as const;

  const lang = (params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua") as keyof typeof byLang;
  const canonical = `${DOMAIN}/${lang}/become-specialist`;

  return {
    title: byLang[lang].title,
    description: byLang[lang].description,
    alternates: {
      canonical,
      languages: {
        uk: `${DOMAIN}/ua/become-specialist`,
        ru: `${DOMAIN}/ru/become-specialist`,
        de: `${DOMAIN}/de/become-specialist`,
      },
    },
  };
}

export default function BecomeSpecialistPage() {
  return <BecomeSpecialistClientPage />;
}

