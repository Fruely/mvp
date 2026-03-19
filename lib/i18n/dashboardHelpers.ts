export const dashboardHelpers = {
  ru: {
    verification: {
      line1: "Пожалуйста, загрузите один из документов:",
      bullet1: "свидетельство о предпринимательстве (Gewerbeanmeldung)",
      bullet2: "или другой документ, подтверждающий вашу деятельность",
      footer: "Это повышает доверие клиентов и требуется для работы в Германии.",
    },
    video: {
      line1: "Добавьте ссылку на видео (YouTube или Vimeo), если у вас есть:",
      bullet1: "презентация услуг",
      bullet2: "примеры работ",
      bullet3: "видео о вас",
      footer: "Видео будет отображаться в вашей карточке специалиста.",
    },
    gallery: {
      line1: "Добавьте фото или видео, чтобы показать ваши работы или процесс.",
      line2: "Они будут отображаться в виде карусели в вашей карточке и повышают доверие клиентов.",
    },
  },
  de: {
    verification: {
      line1: "Bitte laden Sie eines der folgenden Dokumente hoch:",
      bullet1: "Gewerbeanmeldung",
      bullet2: "oder ein anderes Dokument, das Ihre Tätigkeit bestätigt",
      footer: "Das stärkt das Vertrauen der Kunden und ist für die Arbeit in Deutschland erforderlich.",
    },
    video: {
      line1: "Fügen Sie einen Link zu einem Video (YouTube oder Vimeo) hinzu, wenn Sie haben:",
      bullet1: "Präsentation Ihrer Dienstleistungen",
      bullet2: "Arbeitsbeispiele",
      bullet3: "Video über Sie",
      footer: "Das Video wird in Ihrem Spezialistenprofil angezeigt.",
    },
    gallery: {
      line1: "Fügen Sie Fotos oder Videos hinzu, um Ihre Arbeit oder Ihren Prozess zu zeigen.",
      line2: "Sie werden als Karussell in Ihrem Profil angezeigt und stärken das Vertrauen der Kunden.",
    },
  },
} as const;

export type DashboardHelpersLang = keyof typeof dashboardHelpers;

export function getDashboardHelpers(lang?: string) {
  if (lang && lang in dashboardHelpers) {
    return dashboardHelpers[lang as DashboardHelpersLang];
  }
  return dashboardHelpers.ru;
}
