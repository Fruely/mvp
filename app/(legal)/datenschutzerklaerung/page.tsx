import { redirect } from "next/navigation";

/** Legacy URL kept for external links; canonical content lives at `/de/datenschutzerklaerung`. */
export default function LegacyDatenschutzRedirect() {
  redirect("/de/datenschutzerklaerung");
}
