import type { UserSession } from "../services/auth/authService";
import { FIXTURE_LOCAL_IMAGE } from "./fixtureAssets";
import { assertUiFixtureOnly, isUiFixtureBuild } from "./uiFixtureMode";

export type FixtureRole = "guest" | "member" | "dealer" | "admin";

export const FIXTURE_ROLE_STORAGE_KEY = "nonga_ui_fixture_role";

export const FIXTURE_ROLE_LABELS: Record<FixtureRole, string> = {
  guest: "Guest",
  member: "Signed-in user",
  dealer: "Dealer",
  admin: "Admin/Owner",
};

const FIXTURE_DEALER_ID = "fx-dealer-001";

function baseSession(
  partial: Pick<UserSession, "uid" | "email" | "displayName" | "role"> &
    Partial<UserSession>
): UserSession {
  return {
    providerId: "fixture",
    isSimulated: true,
    status: "active",
    membershipType: "free",
    postLimit: 0,
    totalPosts: 0,
    favoriteCars: [],
    aiPersona: "Professional - เน้นข้อมูลสเปกเชิงลึก",
    photoURL: FIXTURE_LOCAL_IMAGE,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastLogin: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

export function buildFixtureRoleSession(role: FixtureRole): UserSession {
  assertUiFixtureOnly("buildFixtureRoleSession");
  switch (role) {
    case "guest":
      return baseSession({
        uid: "fixture-guest-001",
        email: "fixture.guest@example.invalid",
        displayName: "Fixture Guest",
        role: "guest",
      });
    case "member":
      return baseSession({
        uid: "fixture-member-001",
        email: "fixture.member@example.invalid",
        displayName: "Fixture Member",
        role: "member",
        postLimit: 5,
      });
    case "dealer":
      return baseSession({
        uid: "fixture-dealer-001",
        email: "fixture.dealer@example.invalid",
        displayName: "Fixture Dealer",
        role: "dealer",
        dealerId: FIXTURE_DEALER_ID,
        showroomName: "STAGING FICTIONAL DEALER 001",
        dealerProfile: {
          dealerId: FIXTURE_DEALER_ID,
          showroomName: "STAGING FICTIONAL DEALER 001",
        },
        postLimit: 50,
      });
    case "admin":
      return baseSession({
        uid: "fixture-admin-001",
        email: "fixture.admin@example.invalid",
        displayName: "Fixture Admin",
        role: "superadmin",
        postLimit: 100,
      });
  }
}

export function isFixtureRole(value: string | null | undefined): value is FixtureRole {
  return (
    value === "guest" ||
    value === "member" ||
    value === "dealer" ||
    value === "admin"
  );
}

export function readStoredFixtureRole(): FixtureRole {
  if (!isUiFixtureBuild || typeof window === "undefined") return "guest";
  try {
    const raw = window.sessionStorage.getItem(FIXTURE_ROLE_STORAGE_KEY);
    if (isFixtureRole(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "guest";
}

export function writeStoredFixtureRole(role: FixtureRole): void {
  assertUiFixtureOnly("writeStoredFixtureRole");
  window.sessionStorage.setItem(FIXTURE_ROLE_STORAGE_KEY, role);
}

export function isFixtureGuestUid(uid: string | null | undefined): boolean {
  return String(uid ?? "") === "fixture-guest-001" || String(uid ?? "") === "guest-user-100";
}
