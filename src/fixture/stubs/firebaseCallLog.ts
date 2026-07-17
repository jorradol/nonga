/** Call counters for browser/runtime Firebase proof (fixture stubs only). */
export type FixtureFirebaseCallLog = {
  initializeApp: number;
  getApp: number;
  getApps: number;
  getAuth: number;
  getFirestore: number;
  getStorage: number;
  authApi: number;
  firestoreApi: number;
};

declare global {
  interface Window {
    __nongaFixtureFirebaseCalls?: FixtureFirebaseCallLog;
  }
}

export function getFixtureFirebaseCallLog(): FixtureFirebaseCallLog {
  if (typeof window === "undefined") {
    return {
      initializeApp: 0,
      getApp: 0,
      getApps: 0,
      getAuth: 0,
      getFirestore: 0,
      getStorage: 0,
      authApi: 0,
      firestoreApi: 0,
    };
  }
  if (!window.__nongaFixtureFirebaseCalls) {
    window.__nongaFixtureFirebaseCalls = {
      initializeApp: 0,
      getApp: 0,
      getApps: 0,
      getAuth: 0,
      getFirestore: 0,
      getStorage: 0,
      authApi: 0,
      firestoreApi: 0,
    };
  }
  return window.__nongaFixtureFirebaseCalls;
}

function bump(key: keyof FixtureFirebaseCallLog): void {
  getFixtureFirebaseCallLog()[key] += 1;
}

export function recordFixtureFirebaseCall(key: keyof FixtureFirebaseCallLog): void {
  bump(key);
}
