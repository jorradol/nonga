/**
 * v5.6I.14 — Pre-enable Firestore persistence staging runbook guardrails
 * (docs/tests only — no persistence enablement, no deploy, no flag changes)
 * npm run test:v56i14-pre-enable-firestore-persistence-runbook
 */
import { readFileSync } from "node:fs";
import {
  assertSettlementPersistenceReadinessDefaults,
  isDurableSettlementPersistenceActive,
  isSettlementFirestoreWritesEnabled,
  isSuccessFeeRecordEnabled,
  NONGA_SETTLEMENT_DATA_BACKEND_ENV,
  NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV,
  NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV,
  resolveSettlementDataBackend,
} from "../src/services/leads/settlementPersistenceFlags.ts";
import { resolveSettlementDataBackend as resolveBackendFromRepo } from "../src/server/repositories/settlementAdjustmentRepository.ts";

const RUNBOOK_PATH =
  "docs/v5.6I.14-pre-enable-firestore-persistence-staging-runbook.md";
const FLAGS_SRC = readFileSync(
  "src/services/leads/settlementPersistenceFlags.ts",
  "utf8"
);
const PKG = readFileSync("package.json", "utf8");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readRunbook(): string {
  return readFileSync(RUNBOOK_PATH, "utf8");
}

console.log("=== v5.6I.14 Pre-enable Firestore persistence runbook ===\n");

const doc = readRunbook();
const docLower = doc.toLowerCase();

// --- runbook exists and staging-only ---
{
  ok("runbook file exists", doc.length > 800);
  ok("runbook staging only", /staging only|staging `nonga-ce93c`|target.*staging/i.test(doc));
  ok("runbook forbids production", docLower.includes("production") && /ห้าม production|forbids production|ไม่ production/i.test(doc));
  ok(
    "runbook forbids enable in this commit",
    /ยังไม่รัน|ห้ามรัน|docs-only|ยังไม่เปิด persistence/i.test(doc)
  );
  ok("runbook v5.6I.14 label", doc.includes("v5.6I.14"));
}

// --- key flags documented ---
{
  ok("runbook NONGA_SETTLEMENT_DATA_BACKEND", doc.includes("NONGA_SETTLEMENT_DATA_BACKEND"));
  ok(
    "runbook NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED",
    doc.includes("NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED")
  );
  ok(
    "runbook NONGA_SUCCESS_FEE_RECORD_ENABLED",
    doc.includes("NONGA_SUCCESS_FEE_RECORD_ENABLED")
  );
  ok("runbook triple gate", /triple gate|isDurableSettlementPersistenceActive/i.test(doc));
  ok("runbook memory default", /default.*memory|backend.*memory/i.test(docLower));
}

// --- runbook sections ---
{
  ok("runbook pre-enable checklist", /checklist ก่อนเปิด|pre-enable/i.test(doc));
  ok("runbook enablement steps", /enablement steps|phase a|phase b/i.test(docLower));
  ok("runbook smoke test plan", /smoke test plan/i.test(docLower));
  ok(
    "runbook parallel idempotency smoke",
    /parallel.*idempotency|idempotency replay/i.test(docLower)
  );
  ok("runbook rollback plan", /rollback plan/i.test(docLower));
  ok("runbook PII checklist", /pii|privacy/i.test(docLower));
  ok("runbook approval criteria", /approval criteria/i.test(docLower));
  ok("runbook forbids backfill", docLower.includes("backfill"));
  ok("runbook forbids payment", docLower.includes("payment"));
  ok("runbook forbids invoice", docLower.includes("invoice"));
}

// --- runtime defaults unchanged ---
{
  ok("persistence defaults off", assertSettlementPersistenceReadinessDefaults({}));
  ok("firestore writes off", !isSettlementFirestoreWritesEnabled({}));
  ok("success fee off", !isSuccessFeeRecordEnabled({}));
  ok("durable persistence inactive", !isDurableSettlementPersistenceActive({}));
  ok("runtime backend memory", resolveSettlementDataBackend({}) === "memory");
  ok("repo factory backend memory", resolveBackendFromRepo({}) === "memory");
}

// --- flags source unchanged (env constant names only) ---
{
  ok("flags file has backend env", FLAGS_SRC.includes(NONGA_SETTLEMENT_DATA_BACKEND_ENV));
  ok(
    "flags file has writes env",
    FLAGS_SRC.includes(NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED_ENV)
  );
  ok("flags file has success fee env", FLAGS_SRC.includes(NONGA_SUCCESS_FEE_RECORD_ENABLED_ENV));
  ok(
    "flags default memory in code",
    /resolveSettlementDataBackend[\s\S]*?"memory"/.test(FLAGS_SRC)
  );
  ok(
    "flags writes require true",
    /isSettlementFirestoreWritesEnabled[\s\S]*=== "true"/.test(FLAGS_SRC)
  );
}

// --- no env/secrets files modified in this slice (static: repo patterns) ---
{
  ok("no .env committed pattern in runbook", !doc.includes("FIREBASE_PRIVATE_KEY="));
  ok(
    "runbook warns credentials not in repo",
    /credentials|service account|ไม่ commit secrets/i.test(doc)
  );
}

// --- package.json test script ---
{
  ok(
    "package.json has v56i14 script",
    PKG.includes("test:v56i14-pre-enable-firestore-persistence-runbook")
  );
  ok(
    "package.json script points to mts",
    PKG.includes("scripts/test-v56i14-pre-enable-firestore-persistence-runbook.mts")
  );
}

// --- no payment/invoice routes touched ---
{
  const routes = readFileSync("src/server/revenuePreviewRoutes.ts", "utf8");
  ok("no invoice route added", !routes.includes("/api/admin/invoices"));
  ok("revenue routes unchanged pattern", routes.includes("applyAdjustmentWithAudit"));
}

// --- cross-ref prior wiring still present ---
{
  const fsRepo = readFileSync(
    "src/server/repositories/settlementAdjustmentRepositoryFirestore.ts",
    "utf8"
  );
  ok("v56i13 idempotency wiring intact", fsRepo.includes("settlementIdempotencyRecords"));
  ok("v56i13 no in-process cache", !fsRepo.includes("idempotencyCache"));
}

console.log("\nDone v5.6I.14 pre-enable Firestore persistence runbook tests.");
