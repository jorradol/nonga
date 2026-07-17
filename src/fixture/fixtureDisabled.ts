import { UI_FIXTURE_DISABLED_REASON, isUiFixtureBuild } from "./uiFixtureMode";

export function fixtureMutationBlockedMessage(): string {
  return UI_FIXTURE_DISABLED_REASON;
}

export function throwIfFixtureMutation(action: string): void {
  if (!isUiFixtureBuild) return;
  throw new Error(`${UI_FIXTURE_DISABLED_REASON} (${action})`);
}

export function isFixtureMutationBlocked(): boolean {
  return isUiFixtureBuild;
}
