export const FORBIDDEN_RAW_KEY_HINTS = [
  "vin",
  "ownerphone",
  "sellerphone",
  "customerphone",
  "buyerphone",
  "phone",
  "mobile",
  "tel",
  "address",
  "location",
  "ownername",
  "sellername",
  "customername",
  "buyername",
  "fullname",
  "name",
  "customer",
  "buyer",
  "private",
  "internalnote",
  "privatenote",
  "note",
  "remark",
  "internalcost",
  "cost",
  "margin",
  "bank",
  "transfer",
  "payment",
  "token",
  "header",
  "cookie",
  "secret",
  "env",
  "authorization",
  "credential",
] as const;

export function normalizeKeyForPolicy(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenizeKeyForPolicy(key: string): string[] {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function isForbiddenRawKey(key: string): boolean {
  const normalized = normalizeKeyForPolicy(key);
  const tokens = tokenizeKeyForPolicy(key);
  return FORBIDDEN_RAW_KEY_HINTS.some((hint) => {
    if (hint.length <= 3) {
      return tokens.includes(hint);
    }
    return (
      normalized.includes(hint) || tokens.some((token) => token.includes(hint))
    );
  });
}

const SENSITIVE_REGISTRATION_KEY_HINTS = [
  "plate",
  "licenseplate",
  "registration",
  "ทะเบียน",
  "ป้ายทะเบียน",
  "เลขทะเบียน",
  "จังหวัดทะเบียน",
] as const;

export function isSensitiveRegistrationKey(key: string): boolean {
  const normalized = normalizeKeyForPolicy(key);
  const source = `${key.toLowerCase()} ${normalized}`;
  return SENSITIVE_REGISTRATION_KEY_HINTS.some((hint) =>
    source.includes(hint.toLowerCase())
  );
}

