import Link from "next/link";
import { Alert } from "@/components/ui";
import { dashboardLinkPrimaryClass } from "@/components/dashboard/dashboardStyles";
import { t, type Dictionary } from "@/lib/i18n";

export default function HomepagePhotoRecommendationBanner({
  dict,
  href,
}: {
  dict: Dictionary;
  href: string;
}) {
  return (
    <Alert variant="info" title={t(dict, "dashboard.homepagePhoto.title")}>
      <p>{t(dict, "dashboard.home.homepagePhoto.recommendBody")}</p>
      <div className="mt-freuly-3">
        <Link href={href} className={dashboardLinkPrimaryClass}>
          {t(dict, "dashboard.home.homepagePhoto.recommendCta")}
        </Link>
      </div>
    </Alert>
  );
}
