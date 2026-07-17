import { recordFixtureFirebaseCall } from "./firebaseCallLog";

export function initializeApp(_config?: unknown): never {
  recordFixtureFirebaseCall("initializeApp");
  throw new Error("ปิดในโหมดตรวจสอบหน้าจอ: Firebase initializeApp is blocked");
}

export function getApps(): unknown[] {
  recordFixtureFirebaseCall("getApps");
  return [];
}

export function getApp(_name?: string): never {
  recordFixtureFirebaseCall("getApp");
  throw new Error("ปิดในโหมดตรวจสอบหน้าจอ: Firebase getApp is blocked");
}

export default { initializeApp, getApps, getApp };
