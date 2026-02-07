import { redirect } from "next/navigation";

/**
 * Generic login route. Specialists are sent here by getCurrentUserAndSpecialist() when no session.
 * Redirect to specialist claim so they can use their magic link or re-request access.
 */
export default function LoginPage() {
  redirect("/specialist/claim");
}
