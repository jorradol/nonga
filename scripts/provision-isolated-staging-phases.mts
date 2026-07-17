/**
 * Dry-run provisioning orchestrator for isolated staging phases 1–10.
 * Default: PLAN ONLY — no GCP/Firebase mutations.
 *
 * --show-approved-instructions only displays reviewed instructions.
 * It never invokes firebase, gcloud, or infrastructure APIs.
 */

import {
  APPROVAL_PHRASES,
  assertIsolatedTarget,
  requireOwnerApprovalPhrase,
  resolveExplicitIsolatedTarget,
} from "./isolated-staging-guard-lib.mjs";

type PhaseId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface PhaseSpec {
  id: PhaseId;
  title: string;
  actions: string[];
  resources: string[];
  verify: string[];
  rollback: string[];
  approvalGate?: keyof typeof APPROVAL_PHRASES;
  instruction: string;
}

const PHASES: PhaseSpec[] = [
  {
    id: 1,
    title: "Create empty staging project",
    actions: [
      "Exact creation command is withheld pending a new Gate B approval",
      "Record project number and console URL (no secrets)",
    ],
    resources: ["New GCP/Firebase project only"],
    verify: ["firebase projects:list contains PROJECT_ID", "Production nonga-ce93c unchanged"],
    rollback: ["Delete/disable staging project if wrong ID — never touch production"],
    approvalGate: "gateBEmptyProject",
    instruction: "Gate B permits a later command proposal; this script creates nothing",
  },
  {
    id: 2,
    title: "Link billing and enable Firestore, Auth, Storage",
    actions: [
      "Exact billing/service commands are withheld pending a new Gate C approval",
      "Create Firestore (default) in asia-southeast1 on staging project",
      "Enable Email/Password + Google Auth providers",
      "Provision default Storage bucket on staging project",
    ],
    resources: ["Staging Firestore", "Staging Auth", "Staging Storage"],
    verify: ["firestore:databases:list", "Auth providers enabled", "bucket name matches staging project"],
    rollback: ["Disable/delete staging DB/bucket only"],
    approvalGate: "gateCBillingServices",
    instruction: "Gate C is separate from project creation and creates nothing here",
  },
  {
    id: 3,
    title: "Staging secrets and safety defaults",
    actions: [
      "Create Secret Manager secrets on staging project (names only in docs)",
      "Plan env: NONGA_LEAD_CAPTURE_ENABLED unset, VITE_NONGA_PUBLIC_SIGNUP_ENABLED=false",
    ],
    resources: ["Staging Secret Manager"],
    verify: ["Secret parent project = staging", "No production secret bindings"],
    rollback: ["Destroy staging secret versions"],
    approvalGate: "gateCBillingServices",
    instruction: "Values remain out of repo; no secret operation is run",
  },
  {
    id: 4,
    title: "Deploy Cloud Run (staging project)",
    actions: [
      "Exact build command is withheld pending a new Gate E approval",
      "Deploy proposed isolated service nonga-staging-api-2026 only after Gate E",
    ],
    resources: ["Staging Cloud Run", "Staging Artifact Registry"],
    verify: ["gcloud run services describe", "GET <staging-url>/api/health flags OFF"],
    rollback: ["gcloud run services update-traffic to previous revision or delete staging service"],
    approvalGate: "gateEDeployIsolated",
    instruction: "Gate E instructions require explicit project/service/region values",
  },
  {
    id: 5,
    title: "Deploy Hosting + rewrites",
    actions: [
      "npm run build:isolated-staging:hosting (after env for staging VITE_*)",
      "node scripts/deploy-guard-isolated-staging.mjs staging",
      "Exact Hosting deploy command is withheld pending a new Gate E approval",
    ],
    resources: ["Staging Hosting site"],
    verify: ["preflight:isolated-staging HTTP checks", "rewrite targets staging Cloud Run"],
    rollback: ["firebase hosting:rollback --config firebase.isolated-staging.json --project <STAGING>"],
    approvalGate: "gateEDeployIsolated",
    instruction: "Cloud Run existence preflight must pass before Hosting deploy",
  },
  {
    id: 6,
    title: "Seed synthetic fixtures",
    actions: [
      "Create Auth users in staging console",
      "Exact fixture write command is withheld pending a new Gate D approval",
      "Import synthetic listings + upload fixture images to staging bucket",
    ],
    resources: ["Staging Firestore", "Staging Auth", "Staging Storage"],
    verify: ["GET /api/cars count", "No production doc IDs", "docs/examples/staging-synthetic-fixture-manifest.json"],
    rollback: ["Delete fixture docs/users/images in staging only"],
    approvalGate: "gateDSeedFixtures",
    instruction: "Never copy Production Firestore, Auth, or Storage",
  },
  {
    id: 7,
    title: "Enable AI for Owner (optional, post-UI baseline)",
    actions: ["Wire staging-only Gemini secret", "Set budget caps and kill switch"],
    resources: ["Staging secrets", "Staging Cloud Run env"],
    verify: ["AI OFF for public", "allowlist only", "budget alert exists"],
    rollback: ["Remove AI secret binding / kill switch ON"],
    instruction: "Not authorized by Gates A-E; skip for Option B",
  },
  {
    id: 8,
    title: "Isolation and safety tests",
    actions: ["Run npm run preflight:isolated-staging", "Run npm run test:isolated-staging-guard"],
    resources: ["Read-only checks"],
    verify: ["No nonga-ce93c in staging health", "lead/signup OFF"],
    rollback: ["Stop staging traffic if bleed-through detected"],
    instruction: "Automated read-only checks only",
  },
  {
    id: 9,
    title: "Owner browser acceptance",
    actions: ["Dark/Light matrix", "Login member/dealer/admin", "Marketplace/detail smoke"],
    resources: ["Staging URL browser only"],
    verify: ["Owner sign-off notes", "No lead created"],
    rollback: ["Disable staging if production impact suspected"],
    instruction: "Manual Owner session after isolated deployment exists",
  },
  {
    id: 10,
    title: "Freeze staging baseline",
    actions: ["Record project, URL, revision, digest, flags, fixture inventory"],
    resources: ["Documentation only"],
    verify: ["Baseline facts consistent across checks"],
    rollback: ["Correction doc only"],
    instruction: "Documentation only after Owner acceptance",
  },
];

function parsePhaseArg(raw: string): PhaseId[] {
  if (!raw || raw === "all") return PHASES.map((p) => p.id);
  if (/^\d+-\d+$/.test(raw)) {
    const [a, b] = raw.split("-").map(Number);
    return PHASES.filter((p) => p.id >= a && p.id <= b).map((p) => p.id);
  }
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= 10) return [n as PhaseId];
  throw new Error(`Invalid --phase value '${raw}'`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--execute-approved")) {
    throw new Error(
      "--execute-approved was removed because this script never executes infrastructure"
    );
  }
  const showApprovedInstructions = args.includes("--show-approved-instructions");
  const json = args.includes("--json");
  const phaseArg =
    args.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "all";
  const selected = parsePhaseArg(phaseArg);
  const target = resolveExplicitIsolatedTarget(process.env, "planning instructions");
  assertIsolatedTarget(target, "planning instructions");
  const projectId = target.projectId;
  const stagingUrl = target.stagingUrl;
  const phrase = process.env.OWNER_APPROVAL_PHRASE ?? "";

  const report = {
    mode: showApprovedInstructions ? "SHOW_APPROVED_INSTRUCTIONS_ONLY" : "DRY_RUN_PLAN",
    verdict: "HOLD — SAFETY REVISIONS; OWNER APPROVAL REQUIRED",
    projectId,
    stagingUrl,
    infrastructureMutation: false,
    phases: PHASES.filter((p) => selected.includes(p.id)),
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("=== Isolated Staging Provisioning Plan ===");
  console.log(`Mode: ${report.mode}`);
  console.log(`Target project: ${projectId}`);
  console.log(`Target URL: ${stagingUrl}`);
  console.log("Production resources are outside this script's capabilities.");
  console.log("");

  for (const phase of report.phases) {
    console.log(`--- Phase ${phase.id}: ${phase.title} ---`);
    console.log("Actions:");
    for (const action of phase.actions) console.log(`  - ${action}`);
    console.log("Verify:");
    for (const v of phase.verify) console.log(`  - ${v}`);
    console.log("Rollback:");
    for (const r of phase.rollback) console.log(`  - ${r}`);
    console.log(
      `Approval gate: ${phase.approvalGate ?? "No infrastructure gate; Owner review only"}`
    );

    if (showApprovedInstructions) {
      try {
        if (phase.approvalGate) {
          requireOwnerApprovalPhrase(phrase, phase.approvalGate, `phase ${phase.id}`);
        }
        console.log("SHOW ONLY: no infrastructure is created, changed, or deleted.");
        console.log(`INSTRUCTION: ${phase.instruction}`);
      } catch (error) {
        console.error(
          "BLOCKED:",
          error instanceof Error ? error.message : String(error)
        );
        process.exitCode = 1;
      }
    } else {
      console.log("DRY-RUN: no infrastructure commands executed");
    }
    console.log("");
  }

  if (!showApprovedInstructions) {
    console.log("No execution command is provided. Each gate requires a new Owner decision.");
  }
}

main();
