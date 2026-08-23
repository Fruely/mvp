import Link from "next/link";
import { Alert } from "@/components/ui";

type Props = {
  lang: string;
  className?: string;
};

function copy(lang: string): { title: string; body: string; link: string } {
  if (lang === "de") {
    return {
      title: "Keine Kontaktdaten oder externen Links veröffentlichen",
      body: "Bitte veröffentlichen Sie weder im Text noch in Fotos Kontaktdaten, Websites, Social-Media- oder Messenger-Accounts, QR-Codes oder andere Hinweise auf externe Kontaktwege. Nach einer Anfrage über Freuly werden Ihnen die für die Bearbeitung erforderlichen Kontaktdaten der anfragenden Person gemäß den Freuly-Regeln übermittelt.",
      link: "Regeln für Spezialisten ansehen",
    };
  }

  if (lang === "ua") {
    return {
      title: "Не публікуйте контактні дані або зовнішні посилання",
      body: "Не розміщуйте ані в тексті, ані на фотографіях телефони, email, сайти, акаунти соціальних мереж чи месенджерів, QR-коди або інші способи зовнішнього зв’язку. Після заявки через Freuly вам буде передано контактні дані заявника, необхідні для її обробки, відповідно до правил Freuly.",
      link: "Переглянути правила для спеціалістів",
    };
  }

  return {
    title: "Не публикуйте контактные данные или внешние ссылки",
    body: "Не размещайте ни в тексте, ни на фотографиях телефоны, email, сайты, аккаунты социальных сетей или мессенджеров, QR-коды и другие способы внешней связи. После заявки через Freuly вам будут переданы контактные данные заявителя, необходимые для её обработки, в соответствии с правилами Freuly.",
    link: "Открыть правила для специалистов",
  };
}

export default function SpecialistContactRulesNotice({ lang, className }: Props) {
  const text = copy(lang);

  return (
    <Alert variant="warning" title={text.title} className={className}>
      <p>{text.body}</p>
      <Link
        href={`/${lang}/specialist-rules`}
        target="_blank"
        className="mt-2 inline-block font-medium underline underline-offset-2"
      >
        {text.link}
      </Link>
    </Alert>
  );
}
