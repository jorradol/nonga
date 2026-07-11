import type { Express, Request, Response } from "express";
import { DEFAULT_PERSONALITIES } from "../services/ai/personality/personalityConfig";
import {
  getServerAuthContext,
  getServerFirestore,
  ServerAuthError,
} from "./serverAuthContext";

type PersonalityPresetId = keyof typeof DEFAULT_PERSONALITIES;

type UserSettingsTheme = "light" | "dark" | "system";
type UserSettingsLanguage = "th" | "en";

interface UserSettingsRecord {
  theme: UserSettingsTheme;
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: UserSettingsLanguage;
  personalityPreset?: PersonalityPresetId;
  updatedAt: string;
}

const DEFAULT_USER_SETTINGS: UserSettingsRecord = {
  theme: "dark",
  emailNotifications: true,
  pushNotifications: false,
  language: "th",
  updatedAt: new Date().toISOString(),
};

const SETTINGS_ALLOWED_KEYS = new Set([
  "theme",
  "emailNotifications",
  "pushNotifications",
  "language",
]);

const PERSONALITY_PRESET_IDS = new Set(
  Object.keys(DEFAULT_PERSONALITIES) as PersonalityPresetId[]
);

const PERSONALITY_ADMIN_ALLOWED_KEYS = new Set([
  "name",
  "displayNameEn",
  "description",
  "avatarSeed",
  "toneDescription",
  "customSystemInstruction",
  "temperature",
  "signaturePhrases",
  "defaultEmotionScores",
  "colorTheme",
]);

function unauthorized(res: Response, message: string): Response {
  return res.status(401).json({ success: false, message });
}

function forbidden(res: Response, message: string): Response {
  return res.status(403).json({ success: false, message });
}

function badRequest(res: Response, message: string): Response {
  return res.status(400).json({ success: false, message });
}

function normalizeUserSettings(
  raw: Record<string, unknown> | undefined
): UserSettingsRecord {
  const preset = String(raw?.personalityPreset ?? "").trim();
  return {
    theme:
      raw?.theme === "light" || raw?.theme === "dark" || raw?.theme === "system"
        ? raw.theme
        : "dark",
    emailNotifications:
      typeof raw?.emailNotifications === "boolean"
        ? raw.emailNotifications
        : true,
    pushNotifications:
      typeof raw?.pushNotifications === "boolean"
        ? raw.pushNotifications
        : false,
    language: raw?.language === "en" || raw?.language === "th" ? raw.language : "th",
    ...(PERSONALITY_PRESET_IDS.has(preset as PersonalityPresetId)
      ? { personalityPreset: preset as PersonalityPresetId }
      : {}),
    updatedAt:
      typeof raw?.updatedAt === "string" && raw.updatedAt.trim()
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

function parseSettingsPatch(
  body: unknown
): { ok: true; patch: Partial<UserSettingsRecord> } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "รูปแบบคำขอไม่ถูกต้อง" };
  }
  const payload = body as Record<string, unknown>;
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return { ok: false, message: "ไม่พบข้อมูลสำหรับบันทึกการตั้งค่า" };
  }
  for (const key of keys) {
    if (!SETTINGS_ALLOWED_KEYS.has(key)) {
      return { ok: false, message: `ไม่อนุญาตฟิลด์ ${key}` };
    }
  }

  const patch: Partial<UserSettingsRecord> = {};
  if ("theme" in payload) {
    const theme = payload.theme;
    if (theme !== "light" && theme !== "dark" && theme !== "system") {
      return { ok: false, message: "theme ต้องเป็น light/dark/system" };
    }
    patch.theme = theme;
  }
  if ("emailNotifications" in payload) {
    if (typeof payload.emailNotifications !== "boolean") {
      return { ok: false, message: "emailNotifications ต้องเป็น boolean" };
    }
    patch.emailNotifications = payload.emailNotifications;
  }
  if ("pushNotifications" in payload) {
    if (typeof payload.pushNotifications !== "boolean") {
      return { ok: false, message: "pushNotifications ต้องเป็น boolean" };
    }
    patch.pushNotifications = payload.pushNotifications;
  }
  if ("language" in payload) {
    const language = payload.language;
    if (language !== "th" && language !== "en") {
      return { ok: false, message: "language ต้องเป็น th/en" };
    }
    patch.language = language;
  }

  return { ok: true, patch };
}

function projectPublicPersonality(
  personality: Record<string, unknown>
): Record<string, unknown> {
  return {
    id: personality.id,
    name: personality.name,
    displayNameEn: personality.displayNameEn,
    description: personality.description,
    avatarSeed: personality.avatarSeed,
    toneDescription: personality.toneDescription,
    temperature: personality.temperature,
    defaultEmotionScores: personality.defaultEmotionScores,
    colorTheme: personality.colorTheme,
  };
}

async function readSystemPersonalityOverrides(): Promise<Record<string, unknown>> {
  const snapshot = await getServerFirestore()
    .collection("system_configs")
    .doc("nonga_personality_config")
    .get();
  if (!snapshot.exists) return {};
  const data = snapshot.data() as { presets?: Record<string, unknown> } | undefined;
  return data?.presets && typeof data.presets === "object" ? data.presets : {};
}

async function buildPublicPersonalityPayload() {
  const overrides = await readSystemPersonalityOverrides();
  const merged = Object.fromEntries(
    (Object.keys(DEFAULT_PERSONALITIES) as PersonalityPresetId[]).map((presetId) => {
      const base = DEFAULT_PERSONALITIES[presetId] as unknown as Record<string, unknown>;
      const overrideRaw = overrides[presetId];
      const override =
        overrideRaw && typeof overrideRaw === "object" && !Array.isArray(overrideRaw)
          ? (overrideRaw as Record<string, unknown>)
          : {};
      return [presetId, projectPublicPersonality({ ...base, ...override })];
    })
  );
  return merged;
}

function parseAdminPersonalityPatch(
  body: unknown
): { ok: true; patch: Record<string, unknown> } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "รูปแบบข้อมูล personality ไม่ถูกต้อง" };
  }
  const payload = body as Record<string, unknown>;
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return { ok: false, message: "ไม่พบข้อมูลสำหรับอัปเดต personality" };
  }
  for (const key of keys) {
    if (!PERSONALITY_ADMIN_ALLOWED_KEYS.has(key)) {
      return { ok: false, message: `ไม่อนุญาตฟิลด์ ${key}` };
    }
  }
  if ("name" in payload && (typeof payload.name !== "string" || payload.name.length > 120)) {
    return { ok: false, message: "name ต้องเป็นข้อความความยาวไม่เกิน 120 ตัวอักษร" };
  }
  if (
    "customSystemInstruction" in payload &&
    (typeof payload.customSystemInstruction !== "string" ||
      payload.customSystemInstruction.length > 4000)
  ) {
    return {
      ok: false,
      message: "customSystemInstruction ต้องเป็นข้อความความยาวไม่เกิน 4000 ตัวอักษร",
    };
  }
  if ("temperature" in payload) {
    const temp = Number(payload.temperature);
    if (!Number.isFinite(temp) || temp < 0.1 || temp > 1) {
      return { ok: false, message: "temperature ต้องอยู่ระหว่าง 0.1 ถึง 1.0" };
    }
  }
  if ("signaturePhrases" in payload) {
    const list = payload.signaturePhrases;
    if (!Array.isArray(list) || list.some((item) => typeof item !== "string")) {
      return { ok: false, message: "signaturePhrases ต้องเป็น string[]" };
    }
  }
  return { ok: true, patch: payload };
}

async function resolveServerAuth(req: Request, res: Response) {
  try {
    return await getServerAuthContext(req);
  } catch (err) {
    const status = err instanceof ServerAuthError ? err.status : 401;
    const message =
      status === 401
        ? "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ"
        : "บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้ครับ";
    if (status === 401) unauthorized(res, message);
    else forbidden(res, message);
    return null;
  }
}

export function registerUserSelfRoutes(app: Express): void {
  app.get("/api/personality/public", async (_req, res) => {
    try {
      const personalities = await buildPublicPersonalityPayload();
      return res.json({ success: true, data: personalities });
    } catch {
      const fallback = Object.fromEntries(
        (Object.keys(DEFAULT_PERSONALITIES) as PersonalityPresetId[]).map((id) => [
          id,
          projectPublicPersonality(
            DEFAULT_PERSONALITIES[id] as unknown as Record<string, unknown>
          ),
        ])
      );
      return res.json({ success: true, data: fallback });
    }
  });

  app.get("/api/me/profile-ready", async (req, res) => {
    const auth = await resolveServerAuth(req, res);
    if (!auth) return;
    return res.json({
      success: true,
      data: {
        uid: auth.uid,
        role: auth.role,
        status: auth.status,
        profileReady: true,
      },
    });
  });

  app.get("/api/me/profile", async (req, res) => {
    const auth = await resolveServerAuth(req, res);
    if (!auth) return;
    const snapshot = await getServerFirestore().collection("users").doc(auth.uid).get();
    const row =
      snapshot.exists && snapshot.data()
        ? (snapshot.data() as Record<string, unknown>)
        : {};
    return res.json({
      success: true,
      data: {
        uid: auth.uid,
        email: String(row.email ?? auth.email ?? ""),
        displayName: String(row.displayName ?? auth.displayName ?? ""),
        role: String(row.role ?? auth.role),
        status: String(row.status ?? auth.status),
        photoURL: String(row.photoURL ?? ""),
        membershipType: String(row.membershipType ?? "free"),
        postLimit: Number(row.postLimit ?? 5),
        totalPosts: Number(row.totalPosts ?? 0),
        favoriteCars: Array.isArray(row.favoriteCars) ? row.favoriteCars : [],
        aiPersona: String(row.aiPersona ?? "Professional - เน้นข้อมูลสเปกเชิงลึก"),
        premiumExpireDate: row.premiumExpireDate ?? null,
        createdAt:
          typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
        lastLogin:
          typeof row.lastLogin === "string" ? row.lastLogin : new Date().toISOString(),
      },
    });
  });

  app.patch("/api/me/profile", async (req, res) => {
    const auth = await resolveServerAuth(req, res);
    if (!auth) return;
    const payload = req.body;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return badRequest(res, "รูปแบบข้อมูลโปรไฟล์ไม่ถูกต้อง");
    }
    const input = payload as Record<string, unknown>;
    const allowed = new Set([
      "displayName",
      "photoURL",
      "lastLogin",
      "favoriteCars",
      "aiPersona",
      "premiumExpireDate",
    ]);
    for (const key of Object.keys(input)) {
      if (!allowed.has(key)) {
        return badRequest(res, `ไม่อนุญาตฟิลด์ ${key}`);
      }
    }
    if ("displayName" in input && typeof input.displayName !== "string") {
      return badRequest(res, "displayName ต้องเป็นข้อความ");
    }
    if ("photoURL" in input && typeof input.photoURL !== "string") {
      return badRequest(res, "photoURL ต้องเป็นข้อความ");
    }
    if ("lastLogin" in input && typeof input.lastLogin !== "string") {
      return badRequest(res, "lastLogin ต้องเป็นข้อความ");
    }
    if (
      "favoriteCars" in input &&
      (!Array.isArray(input.favoriteCars) ||
        input.favoriteCars.some((item) => typeof item !== "string"))
    ) {
      return badRequest(res, "favoriteCars ต้องเป็น string[]");
    }
    if ("aiPersona" in input && typeof input.aiPersona !== "string") {
      return badRequest(res, "aiPersona ต้องเป็นข้อความ");
    }
    if (
      "premiumExpireDate" in input &&
      input.premiumExpireDate !== null &&
      typeof input.premiumExpireDate !== "string"
    ) {
      return badRequest(res, "premiumExpireDate ต้องเป็น string หรือ null");
    }

    await getServerFirestore().collection("users").doc(auth.uid).set(input, { merge: true });
    return res.json({ success: true });
  });

  app.get("/api/me/settings", async (req, res) => {
    const auth = await resolveServerAuth(req, res);
    if (!auth) return;
    const snapshot = await getServerFirestore()
      .collection("user_settings")
      .doc(auth.uid)
      .get();
    const row =
      snapshot.exists && snapshot.data()
        ? (snapshot.data() as Record<string, unknown>)
        : undefined;
    return res.json({ success: true, data: normalizeUserSettings(row) });
  });

  app.put("/api/me/settings", async (req, res) => {
    const auth = await resolveServerAuth(req, res);
    if (!auth) return;
    const parsed = parseSettingsPatch(req.body);
    if (parsed.ok === false) return badRequest(res, parsed.message);
    const patch = {
      ...parsed.patch,
      updatedAt: new Date().toISOString(),
    };
    await getServerFirestore()
      .collection("user_settings")
      .doc(auth.uid)
      .set(patch, { merge: true });
    const snapshot = await getServerFirestore()
      .collection("user_settings")
      .doc(auth.uid)
      .get();
    const row =
      snapshot.exists && snapshot.data()
        ? (snapshot.data() as Record<string, unknown>)
        : undefined;
    return res.json({ success: true, data: normalizeUserSettings(row) });
  });

  app.get("/api/me/personality", async (req, res) => {
    const auth = await resolveServerAuth(req, res);
    if (!auth) return;
    const settingsSnapshot = await getServerFirestore()
      .collection("user_settings")
      .doc(auth.uid)
      .get();
    const settings =
      settingsSnapshot.exists && settingsSnapshot.data()
        ? (settingsSnapshot.data() as Record<string, unknown>)
        : undefined;
    const selectedPreset = String(settings?.personalityPreset ?? "dealer").trim();
    return res.json({
      success: true,
      data: {
        presetId: PERSONALITY_PRESET_IDS.has(selectedPreset as PersonalityPresetId)
          ? selectedPreset
          : "dealer",
      },
    });
  });

  app.put("/api/me/personality", async (req, res) => {
    const auth = await resolveServerAuth(req, res);
    if (!auth) return;
    const presetId = String((req.body as { presetId?: unknown })?.presetId ?? "").trim();
    if (!PERSONALITY_PRESET_IDS.has(presetId as PersonalityPresetId)) {
      return badRequest(res, "presetId ไม่ถูกต้อง");
    }
    await getServerFirestore().collection("user_settings").doc(auth.uid).set(
      {
        personalityPreset: presetId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return res.json({ success: true, data: { presetId } });
  });

  app.get("/api/admin/personality-config", async (req, res) => {
    const role = String(req.apiAuth?.role ?? "").trim();
    if (role !== "admin" && role !== "superadmin") {
      return forbidden(res, "บัญชีนี้ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบครับ");
    }
    const presets = await readSystemPersonalityOverrides();
    return res.json({ success: true, data: { presets } });
  });

  app.patch("/api/admin/personality-config/:presetId", async (req, res) => {
    const role = String(req.apiAuth?.role ?? "").trim();
    if (role !== "admin" && role !== "superadmin") {
      return forbidden(res, "บัญชีนี้ไม่มีสิทธิ์แก้ไข personality ระดับระบบครับ");
    }
    const presetId = String(req.params.presetId ?? "").trim();
    if (!PERSONALITY_PRESET_IDS.has(presetId as PersonalityPresetId)) {
      return badRequest(res, "presetId ไม่ถูกต้อง");
    }
    const parsed = parseAdminPersonalityPatch(req.body);
    if (parsed.ok === false) return badRequest(res, parsed.message);

    const db = getServerFirestore();
    const docRef = db.collection("system_configs").doc("nonga_personality_config");
    const snapshot = await docRef.get();
    const current = snapshot.exists
      ? ((snapshot.data() as { presets?: Record<string, unknown> }).presets ?? {})
      : {};
    const currentPreset =
      current[presetId] &&
      typeof current[presetId] === "object" &&
      !Array.isArray(current[presetId])
        ? (current[presetId] as Record<string, unknown>)
        : {};

    const nextPresets = {
      ...current,
      [presetId]: {
        ...currentPreset,
        ...parsed.patch,
        updatedAt: new Date().toISOString(),
      },
    };
    await docRef.set({ presets: nextPresets }, { merge: true });
    return res.json({ success: true, data: { presetId } });
  });
}
