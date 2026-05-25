export type FirebaseClientAuthMode =
  | "dev-mock"
  | "beta-token"
  | "firebase-auth"
  | "invalid-production-config";

export interface FirebaseClientConfigLike {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

export interface FirebaseWebConfigEnv {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_MEASUREMENT_ID?: string;
  VITE_FIREBASE_FIRESTORE_DATABASE_ID?: string;
}

export interface FirebaseConfigReport {
  mode: FirebaseClientAuthMode;
  hasFakePlaceholder: boolean;
  isUsableForFirebaseAuth: boolean;
  isProductionSafe: boolean;
  missingRequiredFields: string[];
  fakeFields: string[];
  warnings: string[];
}

export interface FirebaseAuthEnvironment {
  isLocalDev: boolean;
  isProduction: boolean;
  isBetaMode: boolean;
  isFirebaseAuthMode: boolean;
  isInvalidProductionConfig: boolean;
}

export const FIREBASE_AUTH_UNAVAILABLE_THAI =
  "ระบบเข้าสู่ระบบยังไม่ได้เปิดใช้งานในสภาพแวดล้อมนี้ครับ";

const REQUIRED_WEB_CONFIG_FIELDS: Array<keyof FirebaseClientConfigLike> = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
];

const FIREBASE_WEB_ENV_KEYS: Record<keyof FirebaseClientConfigLike, keyof FirebaseWebConfigEnv> = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
  measurementId: "VITE_FIREBASE_MEASUREMENT_ID",
  firestoreDatabaseId: "VITE_FIREBASE_FIRESTORE_DATABASE_ID",
};

function valueOf(
  config: FirebaseClientConfigLike,
  key: keyof FirebaseClientConfigLike
): string {
  return String(config[key] ?? "").trim();
}

export function isFirebasePlaceholderValue(value: unknown): boolean {
  const text = String(value ?? "").trim();
  if (!text) return true;
  return /fake|placeholder|changeme|your[_-]?/i.test(text);
}

function readViteFlag(key: "DEV" | "PROD"): boolean {
  try {
    const meta = import.meta as { env?: Record<string, unknown> };
    return Boolean(meta.env?.[key]);
  } catch {
    return false;
  }
}

function readViteString(key: string): string {
  try {
    const meta = import.meta as { env?: Record<string, unknown> };
    const value = meta.env?.[key];
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

function envValue(
  env: FirebaseWebConfigEnv | undefined,
  key: keyof FirebaseWebConfigEnv
): string {
  const provided = env?.[key];
  if (typeof provided === "string") return provided.trim();
  return readViteString(key);
}

export function resolveFirebaseClientConfig(
  baseConfig: FirebaseClientConfigLike,
  env?: FirebaseWebConfigEnv
): FirebaseClientConfigLike {
  const resolved: FirebaseClientConfigLike = { ...baseConfig };
  for (const [configKey, envKey] of Object.entries(FIREBASE_WEB_ENV_KEYS) as Array<
    [keyof FirebaseClientConfigLike, keyof FirebaseWebConfigEnv]
  >) {
    const value = envValue(env, envKey);
    if (value) {
      resolved[configKey] = value;
    }
  }
  return resolved;
}

export function hasBetaTokenClientEnv(): boolean {
  return Boolean(
    readViteString("VITE_NONGA_DEALER_API_TOKEN") ||
      readViteString("VITE_NONGA_ADMIN_API_TOKEN")
  );
}

export function detectFirebaseClientConfig(
  config: FirebaseClientConfigLike,
  env: { prod?: boolean; dev?: boolean; betaToken?: boolean } = {}
): FirebaseConfigReport {
  const isProd = env.prod ?? readViteFlag("PROD");
  const isDev = env.dev ?? readViteFlag("DEV");
  const betaToken = env.betaToken ?? hasBetaTokenClientEnv();
  const missingRequiredFields = REQUIRED_WEB_CONFIG_FIELDS.filter(
    (field) => !valueOf(config, field)
  ).map(String);
  const fakeFields = REQUIRED_WEB_CONFIG_FIELDS.filter((field) =>
    isFirebasePlaceholderValue(valueOf(config, field))
  ).map(String);
  const hasFakePlaceholder = fakeFields.length > 0;
  const isUsableForFirebaseAuth =
    missingRequiredFields.length === 0 && !hasFakePlaceholder;

  let mode: FirebaseClientAuthMode;
  if (isUsableForFirebaseAuth) {
    mode = "firebase-auth";
  } else if (isProd) {
    mode = "invalid-production-config";
  } else if (betaToken && !isDev) {
    mode = "beta-token";
  } else {
    mode = "dev-mock";
  }

  const warnings: string[] = [];
  if (missingRequiredFields.length > 0) {
    warnings.push(`Missing Firebase web config: ${missingRequiredFields.join(", ")}`);
  }
  if (fakeFields.length > 0) {
    warnings.push(`Firebase placeholder config detected: ${fakeFields.join(", ")}`);
  }
  if (!valueOf(config, "measurementId")) {
    warnings.push("measurementId is not set; analytics can be added later");
  }
  if (mode === "invalid-production-config") {
    warnings.push("Production cannot use fake Firebase client config");
  }

  return {
    mode,
    hasFakePlaceholder,
    isUsableForFirebaseAuth,
    isProductionSafe: mode !== "invalid-production-config",
    missingRequiredFields,
    fakeFields,
    warnings,
  };
}

export function shouldAllowMockAuth(report: FirebaseConfigReport): boolean {
  return report.mode === "dev-mock";
}

export function shouldAllowSandboxTools(report: FirebaseConfigReport): boolean {
  return report.mode === "dev-mock";
}

export function firebaseAuthEnvironment(
  report: FirebaseConfigReport,
  env: { dev?: boolean; prod?: boolean } = {}
): FirebaseAuthEnvironment {
  return {
    isLocalDev: env.dev ?? readViteFlag("DEV"),
    isProduction: env.prod ?? readViteFlag("PROD"),
    isBetaMode: report.mode === "beta-token",
    isFirebaseAuthMode: report.mode === "firebase-auth",
    isInvalidProductionConfig: report.mode === "invalid-production-config",
  };
}

export function reportFirebaseClientConfig(report: FirebaseConfigReport): void {
  if (report.warnings.length === 0) return;
  const message = `[firebase-client-config] ${report.mode}: ${report.warnings.join("; ")}`;
  if (report.mode === "invalid-production-config") {
    console.error(message);
    return;
  }
  console.warn(message);
}
