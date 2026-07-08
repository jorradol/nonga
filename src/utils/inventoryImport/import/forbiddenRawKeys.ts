export const FORBIDDEN_RAW_KEY_HINTS = [
  "vin",
  "plate",
  "licenseplate",
  "fullplate",
  "registration",
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

export function isForbiddenRawKey(key: string): boolean {
  const normalized = normalizeKeyForPolicy(key);
  return FORBIDDEN_RAW_KEY_HINTS.some((hint) => normalized.includes(hint));
}

