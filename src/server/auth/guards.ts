import { redirect } from "next/navigation";
import { getSessionUser } from "./session";

/** Require a logged-in, verified, onboarded user. Redirects otherwise. */
export async function requireUser(opts: { allowUnonboarded?: boolean } = {}) {
  const s = await getSessionUser();
  if (!s) redirect("/login");
  const { user } = s;
  if (!user.email_verified_at) redirect("/verify-email");
  if (!opts.allowUnonboarded && !user.onboarded_at) redirect("/onboarding");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/app");
  return user;
}
