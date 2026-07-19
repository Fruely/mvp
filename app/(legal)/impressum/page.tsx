import { redirect } from "next/navigation";

/** Legacy URL kept for external links; canonical content lives at `/de/impressum`. */
export default function LegacyImpressumRedirect() {
  redirect("/de/impressum");
}
