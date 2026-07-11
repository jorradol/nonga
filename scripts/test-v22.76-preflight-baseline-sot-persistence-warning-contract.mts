/**
 * v22.76 — PREFLIGHT BASELINE SOURCE-OF-TRUTH + PERSISTENCE WARNING CONTRACT
 * npm run test:v22.76
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createRulesTestEnvironment,
  runRuleCase,
} from "./emulator-rules/v544f-test-env.mts";
import { seedFirestoreRulesFixtures } from "./emulator-rules/v544f-firestore-seed.mts";
import { DEALER_A, DOCS, UIDS } from "./emulator-rules/v544f-personas.mts";
import { isValidChatHistoryScope } from "../src/services/chat/chatHistoryService.ts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  process.exitCode = 1;
  console.log("FAIL", name, detail);
}

function read(relPath: string): string {
  return readFileSync(resolve(relPath), "utf8");
}

type WarningClassification = {
  id: string;
  file: string;
  functionName: string;
  genericPath: string;
  operationShape: string;
  authState: string;
  matchingRule: string;
  denyReason: string;
  clientModelValid: "valid" | "invalid";
};

function printClassification(item: WarningClassification): void {
  console.log(
    `WARN_CLASSIFY ${item.id} file=${item.file} fn=${item.functionName} path=${item.genericPath}`
  );
  console.log(
    `WARN_CLASSIFY ${item.id} op='${item.operationShape}' auth='${item.authState}' rule='${item.matchingRule}'`
  );
  console.log(
    `WARN_CLASSIFY ${item.id} reason='${item.denyReason}' clientModel=${item.clientModelValid}`
  );
}

async function runStaticContracts(): Promise<void> {
  const preflight = read("scripts/preflight-staging.mjs");
  const preflightLib = read("scripts/preflight-staging-lib.mjs");
  const buildProvenanceScript = read("scripts/write-build-provenance.mjs");
  const userSelfRoutes = read("src/server/userSelfRoutes.ts");
  const serverAuthContext = read("src/server/serverAuthContext.ts");
  const userService = read("src/services/user/userService.ts");
  const personalityConfig = read("src/services/ai/personality/personalityConfig.ts");
  const chatStore = read("src/stores/chat/chatStore.ts");
  const chatHistory = read("src/services/chat/chatHistoryService.ts");
  const useChat = read("src/hooks/chat/useChat.ts");
  const authService = read("src/services/auth/authService.ts");
  const authContext = read("src/contexts/auth/AuthContext.tsx");

  // A) Preflight source-of-truth checks
  ok(
    "A1 preflight parses staging index asset dynamically",
    preflight.includes("parseMainJsAssetFromHtml(stagingIndexHtml)")
  );
  ok(
    "A2 preflight enforces staging-only URL guard",
    preflight.includes("target is staging only") &&
      preflight.includes("isExpectedStagingUrl(EXPECTED_STAGING_URL)")
  );
  ok(
    "A3 preflight validates main JS asset pattern helper",
    preflightLib.includes("parseMainJsAssetFromHtml") &&
      preflight.includes("parseMainJsAssetFromHtml(stagingIndexHtml)")
  );
  ok(
    "A4 preflight fetches staging main JS asset with HTTP 200",
    preflight.includes("staging main JS asset fetch") &&
      preflight.includes("ensureHttp200(`GET ${stagingMainAsset}`")
  );
  ok(
    "A5 preflight has no hard-coded EXPECTED_HOSTING_ASSET",
    !preflightLib.includes("EXPECTED_HOSTING_ASSET")
  );
  ok(
    "A6 preflight remains read-only no auto-switch/deploy",
    !/firebase use nonga-ce93c|firebase deploy|gcloud run deploy/.test(preflight)
  );
  ok(
    "A7 preflight validates staging build provenance commit/asset parity",
    preflight.includes("staging build provenance payload") &&
      preflight.includes("staging build provenance commit matches local HEAD") &&
      preflight.includes("staging build provenance main asset matches index")
  );
  ok(
    "A8 build provenance file writer emits gitCommit/mainAsset metadata",
    buildProvenanceScript.includes("build-provenance.json") &&
      buildProvenanceScript.includes("gitCommit") &&
      buildProvenanceScript.includes("mainAsset")
  );

  // B) Profile contract
  ok(
    "B1 unauth profile-ready denied at route guard",
    userSelfRoutes.includes('app.get("/api/me/profile-ready"') &&
      userSelfRoutes.includes("resolveServerAuth(req, res)")
  );
  ok(
    "B2 missing profile safe provision exists",
    serverAuthContext.includes("ensureSafeUserProfileProvisioned") &&
      serverAuthContext.includes("tx.create(userRef, safeDefaults)")
  );
  ok(
    "B3 safe provision does not overwrite role/status",
    serverAuthContext.includes('role: "member"') &&
      serverAuthContext.includes('status: "pending"') &&
      serverAuthContext.includes("if (snap.exists)")
  );
  ok(
    "B4 profile ready flow is idempotent/concurrency-safe",
    serverAuthContext.includes("runTransaction") &&
      userService.includes("_profileReadyInflight")
  );
  ok(
    "B5 client-supplied target UID for /api/me/profile rejected",
    userSelfRoutes.includes("const allowed = new Set([") &&
      !/allowed = new Set\([\s\S]*"uid"/.test(userSelfRoutes)
  );

  // C) Settings + personality contract
  ok(
    "C1 settings own read/write via /api/me/settings",
    userService.includes('"/api/me/settings"') &&
      userSelfRoutes.includes('app.get("/api/me/settings"') &&
      userSelfRoutes.includes('app.put("/api/me/settings"')
  );
  ok(
    "C2 settings rejects unknown/security fields",
    userSelfRoutes.includes("SETTINGS_ALLOWED_KEYS") &&
      userSelfRoutes.includes("ไม่อนุญาตฟิลด์")
  );
  ok(
    "C3 no direct runtime client user_settings access",
    !userService.includes('doc(db, "user_settings"')
  );
  ok(
    "C4 personality public DTO hides internal provider/prompt fields",
    userSelfRoutes.includes("projectPublicPersonality") &&
      !/projectPublicPersonality[\s\S]{0,500}customSystemInstruction/.test(
        userSelfRoutes
      )
  );
  ok(
    "C5 buyer cannot write global system config path from runtime",
    !personalityConfig.includes('doc(db, "system_configs"') &&
      personalityConfig.includes("/api/admin/personality-config/")
  );

  // D) Chat history + ai_preferences direct model contract
  const newScopeHydrateSegmentStart = useChat.indexOf("resetChatState();");
  const newScopeHydrateSegmentEnd = useChat.indexOf("if (claimOutcome?.claimed)");
  const newScopeHydrateSegment =
    newScopeHydrateSegmentStart >= 0 &&
    newScopeHydrateSegmentEnd > newScopeHydrateSegmentStart
      ? useChat.slice(newScopeHydrateSegmentStart, newScopeHydrateSegmentEnd)
      : "";
  ok(
    "D1 hydration loads sessions then profile readiness (v22.75 preserved)",
    newScopeHydrateSegment.includes("await loadSessions(chatScope);") &&
      newScopeHydrateSegment.includes(
        "await userService.ensureProfileReady(user.uid);"
      ) &&
      newScopeHydrateSegment.indexOf("await loadSessions(chatScope);") <
        newScopeHydrateSegment.indexOf(
          "await userService.ensureProfileReady(user.uid);"
        )
  );
  ok(
    "D2 stale async guard still active",
    useChat.includes("const isHydrateRunStale = () =>") &&
      useChat.includes("if (isHydrateRunStale()) return;")
  );
  ok(
    "D3 chat sessions scope/path constrained by storageScopeKey",
    chatHistory.includes('collection(db, CHAT_SESSIONS_COLLECTION)') &&
      chatHistory.includes('where("storageScopeKey", "==", scope.storageKey)') &&
      chatHistory.includes("assertValidChatHistoryScope(scope)")
  );
  ok(
    "D3b malformed chat scope rejected client-side",
    isValidChatHistoryScope({
      storageKey: "user:",
      uid: UIDS.member,
      dealerId: null,
      scope: "user",
    }) === false
  );
  ok(
    "D4 ai_preferences scope requires authenticated matching uid before firestore",
    chatStore.includes("shouldUseFirestoreAiPreferences") &&
      chatStore.includes("parseUidFromAiPreferenceScope") &&
      chatStore.includes("scopeUid === auth.currentUser.uid")
  );
  ok(
    "D5 ai_preferences waits profile readiness before Firestore access",
    chatStore.includes("await userService.ensureProfileReady(scopeUid)")
  );
  ok(
    "D6 analyze-memory endpoint untouched report-only",
    chatStore.includes('fetch("/api/gemini/analyze-memory"')
  );
  ok(
    "D7 no direct client users/system_configs creation path",
    !authService.includes('doc(db, "users"') &&
      !authContext.includes("setDoc(userDocRef") &&
      !personalityConfig.includes('doc(db, "system_configs"')
  );
}

async function runRulesContracts(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn(
      "WARN FIRESTORE_EMULATOR_HOST not set; skipping emulator contract checks"
    );
    return;
  }

  const env = await createRulesTestEnvironment({ firestore: true, storage: false });
  try {
    await env.clearFirestore();
    await seedFirestoreRulesFixtures(env);

    const guest = env.unauthenticatedContext().firestore();
    const member = env.authenticatedContext(UIDS.member).firestore();
    const dealerA = env.authenticatedContext(UIDS.dealerA).firestore();
    const otherMember = env.authenticatedContext("member-other-v2276").firestore();
    const missingProfile = env.authenticatedContext("uid-no-profile-v2276").firestore();

    const ownUserSessionId = "v2276-user-own-session";
    const ownUserSession = {
      sessionId: ownUserSessionId,
      scope: "user",
      uid: UIDS.member,
      dealerId: null,
      storageScopeKey: `user:${UIDS.member}`,
      userId: `user:${UIDS.member}`,
      title: "v2276 own",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      status: "active",
    };
    await runRuleCase(
      "R1 own chat session create allowed",
      member.collection("chatSessions").doc(ownUserSessionId).set(ownUserSession),
      "allow"
    );
    await runRuleCase(
      "R2 own chat message create allowed",
      member
        .collection("chatSessions")
        .doc(ownUserSessionId)
        .collection("messages")
        .doc("m1")
        .set({
          messageId: "m1",
          sender: "user",
          text: "hello",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
      "allow"
    );
    await runRuleCase(
      "R3 unauth chat create denied",
      guest.collection("chatSessions").doc("v2276-guest-deny").set({
        ...ownUserSession,
        sessionId: "v2276-guest-deny",
        uid: "guest-any",
        storageScopeKey: "user:guest-any",
        userId: "user:guest-any",
      }),
      "deny"
    );
    await runRuleCase(
      "R4 cross-user chat read denied",
      otherMember.collection("chatSessions").doc(ownUserSessionId).get(),
      "deny"
    );
    await runRuleCase(
      "R5 malformed storageScopeKey currently allowed by rules (tracked gap)",
      member.collection("chatSessions").doc("v2276-malformed").set({
        ...ownUserSession,
        sessionId: "v2276-malformed",
        uid: UIDS.member,
        storageScopeKey: "user:",
        userId: "user:",
      }),
      "allow"
    );

    await runRuleCase(
      "R6 own ai_preferences read allowed",
      member.collection("ai_preferences").doc(`user:${UIDS.member}`).get(),
      "allow"
    );
    await runRuleCase(
      "R7 own ai_preferences write allowed",
      member.collection("ai_preferences").doc(`user:${UIDS.member}`).set(
        {
          userId: UIDS.member,
          focusArea: "general",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        { merge: true }
      ),
      "allow"
    );
    await runRuleCase(
      "R8 cross-user ai_preferences denied",
      dealerA.collection("ai_preferences").doc(`user:${UIDS.member}`).get(),
      "deny"
    );
    await runRuleCase(
      "R9 unauth ai_preferences denied",
      guest.collection("ai_preferences").doc(`user:${UIDS.member}`).get(),
      "deny"
    );
    await runRuleCase(
      "R10 malformed ai_preferences scope denied",
      member.collection("ai_preferences").doc("user:").set({
        userId: UIDS.member,
        focusArea: "general",
      }),
      "deny"
    );
    await runRuleCase(
      "R11 missing profile ai_preferences denied by isActiveUser",
      missingProfile.collection("ai_preferences").doc("user:uid-no-profile-v2276").set({
        userId: "uid-no-profile-v2276",
        focusArea: "general",
      }),
      "deny"
    );

    await runRuleCase(
      "R12 direct client users create denied",
      member.collection("users").doc("uid-new-v2276").set({
        uid: "uid-new-v2276",
        role: "member",
        status: "pending",
      }),
      "deny"
    );
    await runRuleCase(
      "R13 direct user_settings denied (catch-all)",
      member.collection("user_settings").doc(UIDS.member).set({ theme: "dark" }),
      "deny"
    );
    await runRuleCase(
      "R14 direct system_configs denied (catch-all)",
      member.collection("system_configs").doc("nonga_personality_config").set({
        presets: { dealer: { name: "x" } },
      }),
      "deny"
    );

    const warningClassifications: WarningClassification[] = [
      {
        id: "W1",
        file: "src/stores/chat/chatStore.ts",
        functionName: "loadUserPreferences",
        genericPath: "ai_preferences/{scopeKey}",
        operationShape: "getDoc(doc(db,'ai_preferences', storageScopeKey))",
        authState: "signed-in but users/{uid} missing/active profile not ready",
        matchingRule: "match /ai_preferences/{scopeKey} -> canReadAiPreferences -> isActiveUser()",
        denyReason: "rules require existing active users/{uid}; missing profile fails isActiveUser",
        clientModelValid: "valid",
      },
      {
        id: "W2",
        file: "src/stores/chat/chatStore.ts",
        functionName: "analyzeUserPreferences",
        genericPath: "ai_preferences/{scopeKey}",
        operationShape: "setDoc(doc(db,'ai_preferences', storageScopeKey), {...}, {merge:true})",
        authState: "scope malformed/cross-user/unauth",
        matchingRule: "match /ai_preferences/{scopeKey} -> canWriteAiPreferences",
        denyReason: "scope key must match authenticated uid and active profile",
        clientModelValid: "valid",
      },
      {
        id: "W3",
        file: "src/services/chat/chatHistoryService.ts",
        functionName: "createChatSession/appendChatMessage",
        genericPath: "chatSessions/{sessionId}[/messages/{messageId}]",
        operationShape:
          "setDoc chatSessions doc + setDoc chatSessions/{sessionId}/messages/{messageId}",
        authState: "unauth/cross-user/malformed storageScopeKey",
        matchingRule:
          "match /chatSessions/{sessionId} -> canCreateChatSession/canReadChatSession",
        denyReason:
          "rules require signed-in and ownership or dealer membership matching session scope",
        clientModelValid: "valid",
      },
      {
        id: "W4",
        file: "firestore.rules",
        functionName: "canCreateChatSession",
        genericPath: "chatSessions/{sessionId}",
        operationShape:
          "create with uid=request.auth.uid but malformed storageScopeKey='user:'",
        authState: "signed-in active member",
        matchingRule: "match /chatSessions/{sessionId} -> canCreateChatSession",
        denyReason:
          "rules do not currently validate storageScopeKey format; blocked by client-side scope validator",
        clientModelValid: "valid",
      },
    ];

    warningClassifications.forEach(printClassification);
  } finally {
    await env.cleanup();
  }
}

console.log("=== v22.76 preflight baseline + persistence warning contract ===");
await runStaticContracts();
await runRulesContracts();
console.log(`=== v22.76 result: ${pass} passed, ${fail} failed ===`);
if (process.exitCode) process.exit(process.exitCode);
