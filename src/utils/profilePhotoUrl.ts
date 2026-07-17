import { isUiFixtureBuild } from "../fixture/uiFixtureMode";
import { FIXTURE_LOCAL_IMAGE } from "../fixture/fixtureAssets";

export type ProfilePhotoUserLike = {
  photoURL?: string | null;
  displayName?: string | null;
  uid?: string | null;
  email?: string | null;
};

const DEFAULT_PROFILE_AVATAR_SEED = "NongBot";
const PROFILE_AVATAR_STYLE = "bottts";

export function resolveProfilePhotoSeed(
  user: ProfilePhotoUserLike | null | undefined
): string {
  const displayName = user?.displayName?.trim();
  if (displayName) return encodeURIComponent(displayName);

  const uid = user?.uid?.trim();
  if (uid) return encodeURIComponent(uid);

  const emailLocal = user?.email?.split("@")[0]?.trim();
  if (emailLocal) return encodeURIComponent(emailLocal);

  return DEFAULT_PROFILE_AVATAR_SEED;
}

export function resolveProfilePhotoFallbackUrl(
  user: ProfilePhotoUserLike | null | undefined
): string {
  if (isUiFixtureBuild) return FIXTURE_LOCAL_IMAGE;
  return `https://api.dicebear.com/7.x/${PROFILE_AVATAR_STYLE}/svg?seed=${resolveProfilePhotoSeed(user)}`;
}

export function resolveProfilePhotoURL(
  user: ProfilePhotoUserLike | null | undefined
): string {
  const raw = user?.photoURL?.trim();
  if (raw) return raw;
  return resolveProfilePhotoFallbackUrl(user);
}
