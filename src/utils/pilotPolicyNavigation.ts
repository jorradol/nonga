import type { PilotPolicySlug } from "../content/pilotPolicyContent";
import { PILOT_POLICY_PATHS } from "../content/pilotPolicyContent";

export function navigatePilotPolicy(
  slug: PilotPolicySlug,
  setView: (view: "pilot-policy") => void
): void {
  if (typeof window !== "undefined") {
    const next = PILOT_POLICY_PATHS[slug];
    const current = window.location.pathname;
    if (current !== next) {
      window.history.pushState(null, "", next);
    }
  }
  setView("pilot-policy");
}
