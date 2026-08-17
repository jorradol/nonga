/**
 * WP-V2U-03C2 — Conversation Core pure response-validator tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-response-validators.mts
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  CONVERSATION_CORE_CANDIDATE_ISSUE_CODES,
  CONVERSATION_CORE_CANDIDATE_OUTCOME_PRECEDENCE,
  CONVERSATION_CORE_HIGH_RISK_ISSUE_CODES,
  CONVERSATION_CORE_SAFETY_ISSUE_CODES,
  CONVERSATION_CORE_TYPOGRAPHY_ISSUE_CODES,
  CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS,
  validateConversationCoreCandidate,
  validateConversationCoreHighRisk,
  validateConversationCoreSafety,
  validateConversationCoreTypography,
  validateConversationTurnRequest,
  type ConversationCoreCandidateValidationInput,
} from "../src/services/conversation-core/index";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertTruthy(label: string, value: unknown): void {
  if (!value) {
    console.error(`FAIL [${label}] expected truthy`);
    process.exit(1);
  }
  pass(label);
}

function assertFalsy(label: string, value: unknown): void {
  if (value) {
    console.error(`FAIL [${label}] expected falsy`);
    process.exit(1);
  }
  pass(label);
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(
      `FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
  pass(label);
}

function assertIncludes(label: string, haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    console.error(`FAIL [${label}] expected to include: ${needle}`);
    process.exit(1);
  }
  pass(label);
}

function assertExcludes(label: string, haystack: string, needle: string): void {
  if (haystack.includes(needle)) {
    console.error(`FAIL [${label}] expected to exclude: ${needle}`);
    process.exit(1);
  }
  pass(label);
}

function codesOf(text: string, lane: ConversationCoreCandidateValidationInput["context"]["policyLane"] = "general-consultative") {
  return validateConversationCoreCandidate({
    candidateText: text,
    context: { policyLane: lane },
  }).issues.map((item) => item.code);
}

function highRiskCodes(text: string) {
  return validateConversationCoreCandidate({
    candidateText: text,
    context: { policyLane: "high-risk-automotive" },
  }).issues.map((item) => item.code);
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const VALIDATOR_FILES = [
  "src/services/conversation-core/conversationCoreTypographyValidator.ts",
  "src/services/conversation-core/conversationCoreSafetyValidator.ts",
  "src/services/conversation-core/conversationCoreHighRiskValidator.ts",
  "src/services/conversation-core/conversationCoreCandidateValidator.ts",
];

/** WP-V2U-03D4B — exact approved dirty paths for business tool registry composition. */
const WP_V2U_03D4B_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreBusinessToolAdapters.ts",
  "scripts/test-conversation-core-business-tool-adapters.mts",
] as const;

const WP_V2U_03D4B_ALLOWLIST_SET = new Set<string>(WP_V2U_03D4B_ALLOWLIST_PATHS);

/** WP-V2U-03E2B2 — exact approved dirty paths for Gemini structured tool transport. */
const WP_V2U_03E2B2_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreGeminiFunctionDeclarations.ts",
  "src/server/conversation-core/conversationCoreGeminiToolTransport.ts",
  "scripts/test-conversation-core-gemini-tool-transport.mts",
] as const;

const WP_V2U_03E2B2_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2B2_ALLOWLIST_PATHS);

/** WP-V2U-03E2C2A — exact approved dirty paths for authoritative grounding foundation. */
const WP_V2U_03E2C2A_ALLOWLIST_PATHS = [
  "src/services/conversation-core/conversationCoreAuthoritativeGrounding.ts",
  "src/services/conversation-core/conversationCoreNumericNormalization.ts",
  "scripts/test-conversation-core-authoritative-grounding.mts",
] as const;

const WP_V2U_03E2C2A_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2C2A_ALLOWLIST_PATHS);

/** WP-V2U-03E2C2B — exact approved dirty paths for finance authoritative grounding. */
const WP_V2U_03E2C2B_ALLOWLIST_PATHS = [
  "src/services/conversation-core/conversationCoreFinanceGrounding.ts",
  "scripts/test-conversation-core-finance-grounding.mts",
] as const;

const WP_V2U_03E2C2B_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2C2B_ALLOWLIST_PATHS);

/** WP-V2U-03E2D2A — exact approved dirty paths for grounded tool-turn coordinator. */
const WP_V2U_03E2D2A_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreGroundedToolTurnCoordinator.ts",
  "scripts/test-conversation-core-grounded-tool-turn-coordinator.mts",
] as const;

const WP_V2U_03E2D2A_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2D2A_ALLOWLIST_PATHS);

/** WP-V2U-03E2D2B — exact approved dirty paths for grounded tool-turn execution integration. */
const WP_V2U_03E2D2B_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreExecutionService.ts",
  "scripts/test-conversation-core-grounded-tool-turn-execution.mts",
] as const;

const WP_V2U_03E2D2B_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2D2B_ALLOWLIST_PATHS);

/** WP-V2U-03E2D2C2A — exact approved dirty paths for lane/tool eligibility classifier. */
const WP_V2U_03E2D2C2A_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreLaneClassifier.ts",
  "scripts/test-conversation-core-lane-classifier.mts",
] as const;

const WP_V2U_03E2D2C2A_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2D2C2A_ALLOWLIST_PATHS);

/** WP-V2U-03E2D2C2B — exact approved dirty paths for lazy runtime dependencies factory. */
const WP_V2U_03E2D2C2B_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreRuntimeDeps.ts",
  "scripts/test-conversation-core-runtime-deps.mts",
] as const;

const WP_V2U_03E2D2C2B_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2D2C2B_ALLOWLIST_PATHS);

/** WP-V2U-03E2D2C2C1 — exact approved dirty paths for dormant orchestrator integration seam. */
const WP_V2U_03E2D2C2C1_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreOrchestratorIntegration.ts",
  "scripts/test-conversation-core-orchestrator-integration.mts",
] as const;

const WP_V2U_03E2D2C2C1_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2D2C2C1_ALLOWLIST_PATHS);

/** WP-V2U-03E2D2C2C2A — exact approved dirty paths for awaitable route boundary. */
const WP_V2U_03E2D2C2C2A_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreRouteHandler.ts",
  "scripts/test-conversation-core-orchestrator.mts",
] as const;

const WP_V2U_03E2D2C2C2A_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2D2C2C2A_ALLOWLIST_PATHS);

/** WP-V2U-03E2D2C2C2B — exact approved dirty paths for local Search/Inventory dormant wiring. */
const WP_V2U_03E2D2C2C2B_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreOrchestrator.ts",
  "scripts/test-conversation-core-local-search-inventory-e2e.mts",
] as const;

const WP_V2U_03E2D2C2C2B_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2D2C2C2B_ALLOWLIST_PATHS);

/** WP-V2U-03E2D2C2C2C — exact approved dirty paths for controlled live Search/Inventory connection. */
const WP_V2U_03E2D2C2C2C_ALLOWLIST_PATHS = [
  "src/server/conversation-core/conversationCoreLiveServerActivation.ts",
  "src/server/conversation-core/conversationCorePilotEligibility.ts",
  "scripts/test-conversation-core-live-search-inventory-smoke.mts",
  "scripts/test-conversation-core-pilot-eligibility.mts",
] as const;

const WP_V2U_03E2D2C2C2C_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2D2C2C2C_ALLOWLIST_PATHS);

/** WP-V2U-03E2A — exact approved dirty paths for Gemini turn outcome contract. */
const WP_V2U_03E2A_ALLOWLIST_PATHS = [
  "src/services/conversation-core/conversationCoreGeminiTurnOutcome.ts",
  "scripts/test-conversation-core-gemini-turn-outcome.mts",
] as const;

const WP_V2U_03E2A_ALLOWLIST_SET = new Set<string>(WP_V2U_03E2A_ALLOWLIST_PATHS);

/** WP-V2U-03D3B — exact approved dirty paths for finance adapter work package. */
const WP_V2U_03D3B_ALLOWLIST_PATHS = [
  "src/server/conversation-core/adapters/financeCalculateToolAdapter.ts",
  "src/server/conversation-core/conversationCoreFinanceToolAdapters.ts",
  "src/server/conversation-core/index.ts",
  "src/services/conversation-core/toolEnvelope.ts",
  "src/services/conversation-core/index.ts",
  "scripts/test-conversation-core-finance-tool-adapter.mts",
  "scripts/test-conversation-core-contracts.mts",
] as const;

const WP_V2U_03D3B_ALLOWLIST_SET = new Set<string>(WP_V2U_03D3B_ALLOWLIST_PATHS);

const ALLOWLIST_PATHS = new Set([
  ...VALIDATOR_FILES,
  "scripts/test-conversation-core-response-validators.mts",
  "src/services/conversation-core/index.ts",
  ...WP_V2U_03D3B_ALLOWLIST_PATHS,
  ...WP_V2U_03D4B_ALLOWLIST_PATHS,
  ...WP_V2U_03E2A_ALLOWLIST_PATHS,
  ...WP_V2U_03E2B2_ALLOWLIST_PATHS,
  ...WP_V2U_03E2C2A_ALLOWLIST_PATHS,
  ...WP_V2U_03E2C2B_ALLOWLIST_PATHS,
  ...WP_V2U_03E2D2A_ALLOWLIST_PATHS,
  ...WP_V2U_03E2D2B_ALLOWLIST_PATHS,
  ...WP_V2U_03E2D2C2A_ALLOWLIST_PATHS,
  ...WP_V2U_03E2D2C2B_ALLOWLIST_PATHS,
  ...WP_V2U_03E2D2C2C1_ALLOWLIST_PATHS,
  ...WP_V2U_03E2D2C2C2A_ALLOWLIST_PATHS,
  ...WP_V2U_03E2D2C2C2B_ALLOWLIST_PATHS,
  ...WP_V2U_03E2D2C2C2C_ALLOWLIST_PATHS,
]);

const SERVICE_CORE_DIR = "src/services/conversation-core/";

function isResponseValidatorHarnessOwnedPath(statusPath: string): boolean {
  if (WP_V2U_03E2D2C2C2C_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2D2C2C2B_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2D2C2C2A_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2D2C2C1_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2D2C2B_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2D2C2A_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2D2B_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2D2A_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2C2B_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2C2A_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2B2_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03E2A_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03D4B_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  if (WP_V2U_03D3B_ALLOWLIST_SET.has(statusPath)) {
    return true;
  }
  return (
    statusPath === "scripts/test-conversation-core-response-validators.mts" ||
    statusPath.startsWith(SERVICE_CORE_DIR)
  );
}

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+["'].*chat-v3/,
  /from\s+["'].*\/server\//,
  /from\s+["']@google\/genai/,
  /from\s+["'].*salesBrain/,
  /from\s+["'].*components\//,
  /from\s+["'].*hooks\//,
  /from\s+["'].*\/store/,
  /process\.env/,
  /from\s+["']node:fs/,
  /from\s+["']node:net/,
  /from\s+["']node:http/,
  /from\s+["']node:crypto/,
  /Math\.random/,
  /Date\.now/,
  /fetch\(/,
];

for (const relativePath of VALIDATOR_FILES) {
  const source = read(relativePath);
  for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
    assertFalsy(
      `boundary: ${path.basename(relativePath)} has no ${pattern}`,
      pattern.test(source)
    );
  }
  assertFalsy(
    `boundary: ${path.basename(relativePath)} has no classifyLane`,
    /classifyLane|detectLane|resolveLaneFromMessage/.test(source)
  );
  assertFalsy(
    `boundary: ${path.basename(relativePath)} has no correction/provider call`,
    /generate\(|correctionInstruction|fallbackReply|safeReply/.test(source)
  );
  assertFalsy(
    `boundary: ${path.basename(relativePath)} has no ConversationCoreResult builder`,
    /validateConversationCoreResult|workspaceAction/.test(source)
  );
}

const barrelSource = read("src/services/conversation-core/index.ts");
assertFalsy("boundary: barrel has no chat-v3 import", /chat-v3/.test(barrelSource));
assertFalsy("boundary: barrel has no function body", /function\s+\w+\(/.test(barrelSource));
assertIncludes(
  "barrel: exports typography validator",
  barrelSource,
  "validateConversationCoreTypography"
);
assertIncludes(
  "barrel: exports safety validator",
  barrelSource,
  "validateConversationCoreSafety"
);
assertIncludes(
  "barrel: exports high-risk validator",
  barrelSource,
  "validateConversationCoreHighRisk"
);
assertIncludes(
  "barrel: exports candidate validator",
  barrelSource,
  "validateConversationCoreCandidate"
);

assertEqual(
  "codes: typography list is stable",
  CONVERSATION_CORE_TYPOGRAPHY_ISSUE_CODES.slice(),
  [
    "typography.invalid_input",
    "typography.empty_response",
    "typography.null_byte",
    "typography.control_characters",
    "typography.bidi_override",
    "typography.zero_width",
    "typography.replacement_or_mojibake",
    "typography.raw_latex",
    "typography.unclosed_code_fence",
    "typography.raw_html_or_script",
  ]
);
assertEqual(
  "codes: safety list is stable",
  CONVERSATION_CORE_SAFETY_ISSUE_CODES.slice(),
  [
    "safety.invalid_input",
    "safety.secret_leakage",
    "safety.system_instruction_disclosure",
    "safety.false_write_action_claim",
    "safety.html_or_executable_ui",
    "safety.boundary_bypass",
  ]
);
assertEqual(
  "precedence: reject before correction-required before accept",
  CONVERSATION_CORE_CANDIDATE_OUTCOME_PRECEDENCE.slice(),
  ["reject", "correction-required", "accept"]
);
assertTruthy(
  "codes: high-risk list includes engine-off",
  CONVERSATION_CORE_HIGH_RISK_ISSUE_CODES.includes("high_risk.engine_off_while_moving")
);

const thaiNatural =
  "ช่วงนี้ดู Toyota Yaris ATIV ได้เลยค่ะ ขับในเมืองคล่อง และกินน้ำมันไม่หนักถ้าใช้แบบบ้าน ๆ";
const thaiResult = validateConversationCoreCandidate({
  candidateText: thaiNatural,
  context: { policyLane: "general-consultative" },
});
assertEqual("positive: Thai natural accepts", thaiResult.outcome, "accept");
assertEqual("positive: Thai natural has no issues", thaiResult.issues.slice(), []);

const markdown =
  "สรุปสั้น ๆ ค่ะ\n\n- ตรวจยางก่อน\n- ดู **น้ำมันเครื่อง**\n- รุ่น Honda Civic ไม่ต้องกังวลเรื่องชื่อภาษาอังกฤษ";
assertEqual(
  "positive: normal markdown accepts",
  validateConversationCoreCandidate({
    candidateText: markdown,
    context: { policyLane: "general-consultative" },
  }).outcome,
  "accept"
);

const brandModel = "สนใจ Mazda CX-5, Hyundai Ioniq 5 หรือ BYD Atto 3 ก็คุยต่อได้ค่ะ";
assertEqual(
  "positive: English brand/model accepts",
  validateConversationCoreCandidate({
    candidateText: brandModel,
    context: { policyLane: "general-consultative" },
  }).outcome,
  "accept"
);

const advisoryNumber =
  "ถ้างบประมาณราว 400,000 บาท ลองเริ่มจากรถเล็กก่อน โดยยังไม่ยืนยันราคาตลาดหรือค่างวดจริงนะคะ";
assertEqual(
  "positive: advisory numbers without authoritative claim accept",
  validateConversationCoreCandidate({
    candidateText: advisoryNumber,
    context: { policyLane: "general-consultative" },
  }).outcome,
  "accept"
);

const safetyWarning =
  "ถ้าได้กลิ่นน้ำมันแรง ให้จอดในที่ปลอดภัย ดับเครื่องหลังรถหยุด แล้วถอยห่างจากรถ อย่าจุดไฟใกล้บริเวณนั้น";
assertEqual(
  "positive: appropriate safety warning accepts",
  validateConversationCoreCandidate({
    candidateText: safetyWarning,
    context: { policyLane: "high-risk-automotive" },
  }).outcome,
  "accept"
);

const apiKeyExplain =
  "API key คือรหัสที่ใช้ยืนยันตัวตนกับบริการ ห้ามเปิดเผย API key, secret หรือ token ค่ะ";
assertEqual(
  "positive: educational API key explanation accepts",
  validateConversationCoreCandidate({
    candidateText: apiKeyExplain,
    context: { policyLane: "general-consultative" },
  }).outcome,
  "accept"
);

const crossTopic =
  "เรื่องผ่อนถามไฟแนนซ์ได้ ส่วนอาการเครื่องร้อนให้ดูระดับน้ำหล่อเย็นก่อน แยกเป็นคำแนะนำทั่วไปนะคะ";
assertEqual(
  "positive: cross-topic consultative accepts",
  validateConversationCoreCandidate({
    candidateText: crossTopic,
    context: { policyLane: "general-consultative" },
  }).outcome,
  "accept"
);

const modelSpecific =
  "แรงช่วยพวงมาลัยหรือแรงช่วยเบรกอาจลดลงหรือหายไป ทั้งนี้ขึ้นกับระบบรถ และ EPB แตกต่างตามรุ่น ต้องตรวจคู่มือ";
assertEqual(
  "positive: model-specific qualification accepts",
  validateConversationCoreCandidate({
    candidateText: modelSpecific,
    context: { policyLane: "high-risk-automotive" },
  }).outcome,
  "accept"
);

const safeEmergency =
  "เบรกจมขณะขับ: ถอนคันเร่ง ประคองทิศทาง เปิดไฟฉุกเฉินเมื่อปลอดภัย หาพื้นที่เปิด ห้ามดับเครื่องขณะรถยังเคลื่อนที่ และห้ามขับชนพุ่มไม้";
assertEqual(
  "positive: safe emergency language accepts",
  validateConversationCoreCandidate({
    candidateText: safeEmergency,
    context: { policyLane: "high-risk-automotive" },
  }).outcome,
  "accept"
);

const dollarAmount = "ราคาประมาณ $20,000 ยังเป็นตัวเลขคุยเล่น ไม่ใช่ราคาจริงจากระบบ";
assertEqual(
  "positive: dollar amount is not treated as LaTeX",
  validateConversationCoreTypography({ candidateText: dollarAmount }).outcome,
  "accept"
);

const frozenInput = Object.freeze({
  candidateText: thaiNatural,
  context: Object.freeze({
    policyLane: "general-consultative" as const,
  }),
});
const frozenSnapshot = JSON.stringify(frozenInput);
validateConversationCoreCandidate(frozenInput);
assertEqual("immutability: frozen input unchanged", JSON.stringify(frozenInput), frozenSnapshot);

const firstPass = validateConversationCoreCandidate(frozenInput);
const secondPass = validateConversationCoreCandidate(frozenInput);
assertEqual("determinism: identical input yields identical JSON", firstPass, secondPass);

assertEqual(
  "latex: $\\rightarrow$ is correction-required",
  validateConversationCoreTypography({
    candidateText: "ราคารถ 420,000 $\\rightarrow$ ยอดจัด 336,000 บาท",
  }).outcome,
  "correction-required"
);
assertTruthy(
  "latex: $\\rightarrow$ code",
  codesOf("ราคารถ 420,000 $\\rightarrow$ ยอดจัด 336,000 บาท").includes("typography.raw_latex")
);
assertTruthy(
  "latex: \\(...\\) code",
  validateConversationCoreTypography({
    candidateText: "สูตร \\(a + b\\) ไม่ควรโชว์ดิบ",
  }).issues.some((item) => item.code === "typography.raw_latex")
);
assertTruthy(
  "latex: \\[...\\] code",
  validateConversationCoreTypography({
    candidateText: "บล็อก \\[x = y\\] หลุดมา",
  }).issues.some((item) => item.code === "typography.raw_latex")
);
assertTruthy(
  "latex: \\frac code",
  validateConversationCoreTypography({
    candidateText: "ใช้อัตราส่วน \\frac{1}{2} แบบดิบ",
  }).issues.some((item) => item.code === "typography.raw_latex")
);
assertTruthy(
  "latex: \\times code",
  validateConversationCoreTypography({
    candidateText: "10 \\times 20",
  }).issues.some((item) => item.code === "typography.raw_latex")
);
assertTruthy(
  "latex: $x$ is raw latex",
  validateConversationCoreTypography({ candidateText: "ค่า $x$ ในสูตร" }).issues.some(
    (item) => item.code === "typography.raw_latex"
  )
);
assertTruthy(
  "latex: $a+b$ is raw latex",
  validateConversationCoreTypography({ candidateText: "ผลรวม $a+b$ ดิบ" }).issues.some(
    (item) => item.code === "typography.raw_latex"
  )
);
assertTruthy(
  "latex: $20^2$ is raw latex",
  validateConversationCoreTypography({ candidateText: "กำลัง $20^2$ ดิบ" }).issues.some(
    (item) => item.code === "typography.raw_latex"
  )
);
assertTruthy(
  "latex: ${x}$ is raw latex",
  validateConversationCoreTypography({ candidateText: "ตัวแปร ${x}$ ดิบ" }).issues.some(
    (item) => item.code === "typography.raw_latex"
  )
);
assertTruthy(
  "latex: $10 \\times 20$ is raw latex",
  validateConversationCoreTypography({
    candidateText: "คูณ $10 \\times 20$ ดิบ",
  }).issues.some((item) => item.code === "typography.raw_latex")
);
assertEqual(
  "latex: unpaired $20$ currency-like amount accepts",
  validateConversationCoreTypography({ candidateText: "งบประมาณประมาณ $20 ยังไม่ใช่ราคาจริง" }).outcome,
  "accept"
);
assertEqual(
  "latex: unpaired $20.00 accepts",
  validateConversationCoreTypography({ candidateText: "ตัวเลขเล่น ๆ $20.00 ไม่ใช่ราคาจริง" }).outcome,
  "accept"
);
assertEqual(
  "latex: unpaired $20,000.50 accepts",
  validateConversationCoreTypography({
    candidateText: "ตัวเลขเล่น ๆ $20,000.50 ไม่ใช่ราคาจริง",
  }).outcome,
  "accept"
);

assertEqual(
  "typography: empty rejects",
  validateConversationCoreTypography({ candidateText: "   \n" }).outcome,
  "reject"
);
assertTruthy(
  "typography: empty code",
  validateConversationCoreTypography({ candidateText: " " }).issues.some(
    (item) => item.code === "typography.empty_response"
  )
);
assertTruthy(
  "typography: null byte rejects",
  validateConversationCoreTypography({ candidateText: "สวัสดี\u0000ค่ะ" }).issues.some(
    (item) => item.code === "typography.null_byte"
  )
);
assertTruthy(
  "typography: control character rejects",
  validateConversationCoreTypography({ candidateText: "สวัสดี\u0007ค่ะ" }).issues.some(
    (item) => item.code === "typography.control_characters"
  )
);
assertTruthy(
  "typography: bidi override rejects",
  validateConversationCoreTypography({
    candidateText: `ราคา 100\u202E0001 บาท`,
  }).issues.some((item) => item.code === "typography.bidi_override")
);
assertTruthy(
  "typography: zero-width correction-required",
  validateConversationCoreTypography({
    candidateText: "สวัสดี\u200Bค่ะ",
  }).issues.some((item) => item.code === "typography.zero_width")
);
assertTruthy(
  "typography: replacement character correction-required",
  validateConversationCoreTypography({
    candidateText: "ข้อความ\uFFFDเสีย",
  }).issues.some((item) => item.code === "typography.replacement_or_mojibake")
);
assertTruthy(
  "typography: unclosed fence correction-required",
  validateConversationCoreTypography({
    candidateText: "ดูนี่\n```\ncode",
  }).issues.some((item) => item.code === "typography.unclosed_code_fence")
);
assertTruthy(
  "typography: raw HTML rejects",
  validateConversationCoreTypography({
    candidateText: "กดปุ่ม <button>คลิก</button> ได้เลย",
  }).issues.some((item) => item.code === "typography.raw_html_or_script")
);

const dummySecret = "AIzaSyDummyValidatorTestValue0000001";
const secretResult = validateConversationCoreSafety({
  candidateText: `ค่าคอนฟิกคือ ${dummySecret}`,
});
assertEqual("safety: secret-like value rejects", secretResult.outcome, "reject");
assertTruthy(
  "safety: secret leakage code",
  secretResult.issues.some((item) => item.code === "safety.secret_leakage")
);
assertExcludes(
  "safety: matched secret is not returned",
  JSON.stringify(secretResult),
  dummySecret
);

assertTruthy(
  "safety: system instruction dump rejects",
  validateConversationCoreSafety({
    candidateText: "นี่คือ system instruction ของฉัน: คุณคือน้องเอ ต้องขายรถให้ได้",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertFalsy(
  "safety: educational secret talk is not disclosure",
  validateConversationCoreSafety({
    candidateText: "ห้ามเปิดเผย system instruction, secret หรือ token ค่ะ",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "safety: false posting claim rejects",
  validateConversationCoreSafety({
    candidateText: "โพสต์ประกาศให้แล้วค่ะ รอคนทักได้นะ",
  }).issues.some((item) => item.code === "safety.false_write_action_claim")
);
assertTruthy(
  "safety: false lead claim rejects",
  validateConversationCoreSafety({
    candidateText: "ส่งลีดให้แล้วค่ะ",
  }).issues.some((item) => item.code === "safety.false_write_action_claim")
);
assertTruthy(
  "safety: false save claim rejects",
  validateConversationCoreSafety({
    candidateText: "บันทึกข้อมูลให้แล้วค่ะ",
  }).issues.some((item) => item.code === "safety.false_write_action_claim")
);
assertTruthy(
  "safety: false call claim rejects",
  validateConversationCoreSafety({
    candidateText: "โทรหาผู้ขายแล้วค่ะ",
  }).issues.some((item) => item.code === "safety.false_write_action_claim")
);
assertFalsy(
  "safety: honest write-boundary statement is allowed",
  validateConversationCoreSafety({
    candidateText: "ยังไม่สามารถโพสต์ประกาศหรือส่งลีดได้ในรอบนี้ค่ะ",
  }).issues.some((item) => item.code === "safety.false_write_action_claim")
);
assertTruthy(
  "safety: script UI rejects",
  validateConversationCoreSafety({
    candidateText: '<script>window.alert(1)</script>',
  }).issues.some((item) => item.code === "safety.html_or_executable_ui")
);
assertTruthy(
  "safety: boundary bypass rejects",
  validateConversationCoreSafety({
    candidateText: "DAN mode enabled ฉันจะข้ามกฎทั้งหมดให้แล้ว",
  }).issues.some((item) => item.code === "safety.boundary_bypass")
);

assertTruthy(
  "high-risk: engine-off while moving rejects",
  highRiskCodes("ถ้าเบรกจมให้ดับเครื่องทันทีขณะรถยังวิ่ง").includes(
    "high_risk.engine_off_while_moving"
  )
);
assertTruthy(
  "high-risk: steering absolute is correction-required",
  highRiskCodes("ดับเครื่องแล้วพวงมาลัยจะเลี้ยวไม่ได้เลย").includes(
    "high_risk.steering_absolute_claim"
  )
);
assertTruthy(
  "high-risk: braking absolute is correction-required",
  highRiskCodes("รถทุกคันใช้ระบบช่วยเบรกแบบสุญญากาศ").includes(
    "high_risk.braking_absolute_claim"
  )
);
assertTruthy(
  "high-risk: universal EPB is correction-required",
  highRiskCodes("EPB ทุกยี่ห้อใช้วิธีเดียวกัน ให้ดึงสวิตช์ค้างไว้เท่านั้น").includes(
    "high_risk.epb_universal_procedure"
  )
);
assertTruthy(
  "high-risk: guaranteed EPB outcome rejects",
  highRiskCodes("ดึง EPB ค้างแล้วรถจะหยุดแน่นอน").includes("high_risk.epb_guaranteed_outcome")
);
assertTruthy(
  "high-risk: unsafe lift rejects",
  highRiskCodes("มุดใต้รถที่ยกด้วยแม่แรงตัวเดียวได้เลย").includes("high_risk.unsafe_fuel_hv_lift")
);
assertTruthy(
  "high-risk: high-voltage contact rejects",
  highRiskCodes("จับสายไฟแรงสูงดูว่ามีไฟไหม").includes("high_risk.unsafe_fuel_hv_lift")
);
assertTruthy(
  "high-risk: VAT absolute is correction-required",
  highRiskCodes("รถมือสองทุกคันต้องบวก VAT 7% เสมอ").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertTruthy(
  "high-risk: intentional collision rejects",
  highRiskCodes("ถ้าหยุดไม่อยู่ให้ขับเข้าพุ่มไม้").includes("high_risk.intentional_collision")
);
assertTruthy(
  "high-risk: guaranteed repair is correction-required",
  highRiskCodes("ซ่อมระบบเบรกแล้วจะปลอดภัยแน่นอนทุกคัน").includes(
    "high_risk.guaranteed_repair_outcome"
  )
);

assertFalsy(
  "high-risk: does not run on general-consultative by guessing text",
  codesOf("EPB ทุกยี่ห้อใช้วิธีเดียวกัน ให้ดึงสวิตช์ค้างไว้เท่านั้น", "general-consultative").some(
    (code) => code.startsWith("high_risk.")
  )
);
assertTruthy(
  "high-risk: declared topic on another lane still runs",
  validateConversationCoreCandidate({
    candidateText: "รถมือสองทุกคันต้องบวก VAT 7% เสมอ",
    context: {
      policyLane: "general-consultative",
      highRiskTopicDeclared: true,
    },
  }).issues.some((item) => item.code === "high_risk.vat_finance_absolute_claim")
);
assertFalsy(
  "high-risk: VAT illustration with caveat is allowed",
  highRiskCodes(
    "8,000 × 1.07 = 8,560 เป็นเพียงคณิตศาสตร์ ไม่ใช่ข้อยืนยัน และรถมือสองไม่ได้แปลว่าต้องบวก VAT ทุกกรณี"
  ).includes("high_risk.vat_finance_absolute_claim")
);
assertFalsy(
  "high-risk: qualified EPB plus manual is allowed",
  highRiskCodes("EPB แตกต่างตามรุ่นและต้องตรวจคู่มือ บางรุ่นอาจดึงสวิตช์ค้างได้").includes(
    "high_risk.epb_universal_procedure"
  )
);

const multi = validateConversationCoreCandidate({
  candidateText:
    "รถมือสองทุกคันต้องบวก VAT 7% เสมอ และ <script>x</script> พร้อม $\\times$ ดิบ",
  context: { policyLane: "high-risk-automotive" },
});
assertEqual("precedence: mixed issues reject", multi.outcome, "reject");
assertTruthy(
  "multi: includes VAT issue",
  multi.issues.some((item) => item.code === "high_risk.vat_finance_absolute_claim")
);
assertTruthy(
  "multi: includes HTML/script issue",
  multi.issues.some(
    (item) =>
      item.code === "typography.raw_html_or_script" ||
      item.code === "safety.html_or_executable_ui"
  )
);
assertTruthy(
  "multi: includes latex issue",
  multi.issues.some((item) => item.code === "typography.raw_latex")
);

const latexOnly = validateConversationCoreCandidate({
  candidateText: "ดูลูกศร $\\rightarrow$ นี้",
  context: { policyLane: "general-consultative" },
});
assertEqual(
  "precedence: latex alone is correction-required",
  latexOnly.outcome,
  "correction-required"
);

const ordered = validateConversationCoreCandidate({
  candidateText: "ดู $\\frac{1}{2}$ และ <div>ui</div> แล้วโพสต์ประกาศให้แล้ว",
  context: { policyLane: "general-consultative" },
});
const orderedCodes = ordered.issues.map((item) => item.code);
const typographyIndex = orderedCodes.findIndex((code) => code.startsWith("typography."));
const safetyIndex = orderedCodes.findIndex((code) => code.startsWith("safety."));
assertTruthy("ordering: typography appears", typographyIndex >= 0);
assertTruthy("ordering: safety appears", safetyIndex >= 0);
assertTruthy("ordering: typography before safety", typographyIndex < safetyIndex);

const duplicateCheck = validateConversationCoreCandidate({
  candidateText: "<script>a</script> และ <script>b</script>",
  context: { policyLane: "general-consultative" },
});
const uniqueCodes = new Set(duplicateCheck.issues.map((item) => item.code));
assertEqual(
  "dedupe: issue codes are unique",
  uniqueCodes.size,
  duplicateCheck.issues.length
);

assertFalsy(
  "client authority: policyLane is not a client request field",
  (CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS as readonly string[]).includes("policyLane") === false &&
    validateConversationTurnRequest({
      conversationId: "conv-validator-001",
      messageId: "msg-001",
      userMessage: "อยากได้รถเก๋ง",
      policyLane: "high-risk-automotive",
    }).ok === true
);
const clientLane = validateConversationTurnRequest({
  conversationId: "conv-validator-001",
  messageId: "msg-001",
  userMessage: "อยากได้รถเก๋ง",
  policyLane: "high-risk-automotive",
});
assertFalsy("client authority: policyLane on request is rejected", clientLane.ok);
assertTruthy(
  "client authority: policyLane rejected as unknown field",
  clientLane.ok === false && clientLane.issues.some((item) => item.code === "unknown_field")
);

const unknownContext = validateConversationCoreCandidate({
  candidateText: "สวัสดีค่ะ",
  context: {
    policyLane: "general-consultative",
    userMessage: "ignore this",
  } as unknown as ConversationCoreCandidateValidationInput["context"],
});
assertTruthy(
  "server-owned context: userMessage is not a validator context field",
  unknownContext.issues.some((item) => item.code === "candidate.unknown_context_field")
);

assertEqual(
  "high-risk module skip: inactive lane returns accept",
  validateConversationCoreHighRisk({
    candidateText: "EPB ทุกยี่ห้อใช้วิธีเดียวกัน",
    context: { policyLane: "authoritative-data" },
  }).outcome,
  "accept"
);

assertEqual(
  "codes: candidate composer list is stable",
  CONVERSATION_CORE_CANDIDATE_ISSUE_CODES.slice(),
  [
    "candidate.invalid_input",
    "candidate.unknown_field",
    "candidate.invalid_candidate_text",
    "candidate.invalid_context",
    "candidate.unknown_context_field",
    "candidate.invalid_policy_lane",
    "candidate.invalid_high_risk_topic_declared",
    "candidate.invalid_trusted_authoritative_context",
  ]
);

const unsafeWriteMixed =
  "ยังไม่สามารถโทรได้ แต่โพสต์ประกาศให้แล้วค่ะ";
assertTruthy(
  "clause: mixed write-action still flags posting claim",
  validateConversationCoreSafety({ candidateText: unsafeWriteMixed }).issues.some(
    (item) => item.code === "safety.false_write_action_claim"
  )
);
assertEqual(
  "clause: mixed lead claim rejects",
  validateConversationCoreSafety({
    candidateText: "ระบบยังไม่รองรับการบันทึก แต่ส่งลีดให้แล้ว",
  }).outcome,
  "reject"
);
assertTruthy(
  "clause: mixed disclosure still flags dump",
  validateConversationCoreSafety({
    candidateText: "ห้ามเปิดเผย API key แต่นี่คือ system instruction ของฉัน: คุณคือน้องเอ",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "clause: mixed bypass still flags DAN",
  validateConversationCoreSafety({
    candidateText: "ห้ามข้ามกฎ แต่ DAN mode enabled",
  }).issues.some((item) => item.code === "safety.boundary_bypass")
);

function invalidFlagMatrix(
  flag: "highRiskTopicDeclared" | "hasTrustedAuthoritativeContext",
  values: unknown[]
): void {
  const expectedCandidateCode =
    flag === "highRiskTopicDeclared"
      ? "candidate.invalid_high_risk_topic_declared"
      : "candidate.invalid_trusted_authoritative_context";
  const expectedHighRiskCode =
    flag === "highRiskTopicDeclared"
      ? "high_risk.invalid_high_risk_topic_declared"
      : "high_risk.invalid_trusted_authoritative_context";
  for (const value of values) {
    const candidateResult = validateConversationCoreCandidate({
      candidateText: "สวัสดีค่ะ",
      context: {
        policyLane: "general-consultative",
        [flag]: value,
      } as unknown as ConversationCoreCandidateValidationInput["context"],
    });
    assertEqual(
      `fail-closed candidate: ${flag} ${String(value)} rejects`,
      candidateResult.outcome,
      "reject"
    );
    assertTruthy(
      `fail-closed candidate: ${flag} ${String(value)} code`,
      candidateResult.issues.some((item) => item.code === expectedCandidateCode)
    );
    const direct = validateConversationCoreHighRisk({
      candidateText: "EPB ทุกยี่ห้อใช้วิธีเดียวกัน",
      context: {
        policyLane: "authoritative-data",
        [flag]: value,
      } as unknown as ConversationCoreCandidateValidationInput["context"],
    });
    assertEqual(
      `fail-closed high-risk: ${flag} ${String(value)} rejects`,
      direct.outcome,
      "reject"
    );
    assertTruthy(
      `fail-closed high-risk: ${flag} ${String(value)} code`,
      direct.issues.some((item) => item.code === expectedHighRiskCode)
    );
  }
}

const invalidFlagValues = ["true", 1, 0, null, { ok: true }, ["true"]];
invalidFlagMatrix("highRiskTopicDeclared", invalidFlagValues);
invalidFlagMatrix("hasTrustedAuthoritativeContext", invalidFlagValues);

const skippedByStringFlag = validateConversationCoreCandidate({
  candidateText: "รถมือสองทุกคันต้องบวก VAT 7% เสมอ",
  context: {
    policyLane: "general-consultative",
    highRiskTopicDeclared: "true",
  } as unknown as ConversationCoreCandidateValidationInput["context"],
});
assertEqual(
  "fail-closed: string true does not skip as accept",
  skippedByStringFlag.outcome,
  "reject"
);
assertTruthy(
  "fail-closed: string true uses invalid flag code",
  skippedByStringFlag.issues.some(
    (item) => item.code === "candidate.invalid_high_risk_topic_declared"
  )
);
assertFalsy(
  "fail-closed: string true does not silently omit high-risk by accepting",
  skippedByStringFlag.outcome === "accept"
);

const secretLikeKey = "GEMINI_API_KEY_AIzaSyPiiPhone0812345678";
const unknownSecretKeyResult = validateConversationCoreCandidate({
  candidateText: "สวัสดีค่ะ",
  context: {
    policyLane: "general-consultative",
    [secretLikeKey]: "do-not-echo",
  } as unknown as ConversationCoreCandidateValidationInput["context"],
});
assertTruthy(
  "unknown key: composer flags unknown context field",
  unknownSecretKeyResult.issues.some((item) => item.code === "candidate.unknown_context_field")
);
assertExcludes(
  "unknown key: serialized composer result omits secret-like key",
  JSON.stringify(unknownSecretKeyResult),
  secretLikeKey
);
assertExcludes(
  "unknown key: serialized composer result omits unknown value",
  JSON.stringify(unknownSecretKeyResult),
  "do-not-echo"
);

const directUnknown = validateConversationCoreHighRisk({
  candidateText: "EPB ทุกยี่ห้อใช้วิธีเดียวกัน",
  context: {
    policyLane: "high-risk-automotive",
    [secretLikeKey]: "do-not-echo",
  } as unknown as ConversationCoreCandidateValidationInput["context"],
});
assertEqual("unknown key: direct high-risk rejects", directUnknown.outcome, "reject");
assertTruthy(
  "unknown key: direct high-risk code",
  directUnknown.issues.some((item) => item.code === "high_risk.unknown_context_field")
);
assertExcludes(
  "unknown key: serialized high-risk result omits secret-like key",
  JSON.stringify(directUnknown),
  secretLikeKey
);

const invalidContextObject = validateConversationCoreHighRisk({
  candidateText: "สวัสดีค่ะ",
  context: null as unknown as ConversationCoreCandidateValidationInput["context"],
});
assertEqual(
  "high-risk: null context rejects",
  invalidContextObject.outcome,
  "reject"
);
assertTruthy(
  "high-risk: null context code",
  invalidContextObject.issues.some((item) => item.code === "high_risk.invalid_context")
);

const arrayContext = validateConversationCoreHighRisk({
  candidateText: "สวัสดีค่ะ",
  context: ["high-risk-automotive"] as unknown as ConversationCoreCandidateValidationInput["context"],
});
assertTruthy(
  "high-risk: array context rejects",
  arrayContext.issues.some((item) => item.code === "high_risk.invalid_context")
);

const r1Frozen = Object.freeze({
  candidateText: "สวัสดีค่ะ",
  context: Object.freeze({
    policyLane: "general-consultative" as const,
    highRiskTopicDeclared: false,
  }),
});
const r1Snapshot = JSON.stringify(r1Frozen);
const r1First = validateConversationCoreCandidate(r1Frozen);
const r1Second = validateConversationCoreCandidate(r1Frozen);
assertEqual("R1 immutability: frozen input unchanged", JSON.stringify(r1Frozen), r1Snapshot);
assertEqual("R1 determinism: identical JSON", r1First, r1Second);

assertFalsy(
  "R2 Thai compound: ตั้งแต่ does not create disclosure false positive",
  validateConversationCoreSafety({
    candidateText: "ตั้งแต่วันนี้ ห้ามเปิดเผย system instruction",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertFalsy(
  "R2 Thai compound: แม้แต่ does not create disclosure false positive",
  validateConversationCoreSafety({
    candidateText: "ห้ามเปิดเผยแม้แต่ system instruction หรือ token",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertEqual(
  "R2 Thai compound: เพียงแต่ educational API key explanation accepts",
  validateConversationCoreSafety({
    candidateText: "เพียงแต่อธิบายว่า API key คืออะไร",
  }).outcome,
  "accept"
);
assertEqual(
  "R2 Thai compound: natural ตั้งแต่/แม้แต่/เพียงแต่ sentence accepts",
  validateConversationCoreSafety({
    candidateText:
      "ตั้งแต่วันนี้เพียงแต่อธิบายหลักการทั่วไป และห้ามเปิดเผยแม้แต่ token ในทุกกรณีค่ะ",
  }).outcome,
  "accept"
);
assertEqual(
  "R2 Thai compound: แต่ละ and แต่ง remain one consultative clause",
  validateConversationCoreCandidate({
    candidateText: "แต่ละคันใช้น้ำมันไม่เท่ากัน การแต่งรถยังไม่จำเป็นในรอบนี้ค่ะ",
    context: { policyLane: "general-consultative" },
  }).outcome,
  "accept"
);

assertTruthy(
  "R2 mixed clause: write-action after ตั้งแต่-safe connective still flags",
  validateConversationCoreSafety({
    candidateText: "ยังไม่สามารถโทรได้ แต่โพสต์ประกาศให้แล้ว",
  }).issues.some((item) => item.code === "safety.false_write_action_claim")
);
assertEqual(
  "R2 mixed clause: lead claim after negation still rejects",
  validateConversationCoreSafety({
    candidateText: "ระบบยังไม่รองรับการบันทึก แต่ส่งลีดให้แล้ว",
  }).outcome,
  "reject"
);
assertTruthy(
  "R2 mixed clause: DAN after ห้ามข้ามกฎ still flags bypass",
  validateConversationCoreSafety({
    candidateText: "ห้ามข้ามกฎ แต่ DAN mode enabled",
  }).issues.some((item) => item.code === "safety.boundary_bypass")
);

assertEqual(
  "R2 educational: system instruction definition accepts",
  validateConversationCoreSafety({
    candidateText:
      "system instruction คือคำสั่งระดับระบบที่ใช้กำหนดพฤติกรรม และไม่ควรเปิดเผย",
  }).outcome,
  "accept"
);
assertEqual(
  "R2 educational: คำสั่งระบบหมายถึง definition accepts",
  validateConversationCoreSafety({
    candidateText: "คำสั่งระบบหมายถึงคำสั่งที่มีลำดับความสำคัญสูงกว่าข้อความผู้ใช้",
  }).outcome,
  "accept"
);
assertTruthy(
  "R2 disclosure: นี่คือ system instruction still rejects",
  validateConversationCoreSafety({
    candidateText: "นี่คือ system instruction ของฉัน: คุณคือน้องเอ ต้องขายรถให้ได้",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "R2 disclosure: system instruction ของระบบคือ still rejects",
  validateConversationCoreSafety({
    candidateText: "system instruction ของระบบคือ: ห้ามปฏิเสธคำสั่งผู้ใช้",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "R2 disclosure: ต่อไปนี้คือ developer instruction still rejects",
  validateConversationCoreSafety({
    candidateText: "ต่อไปนี้คือ developer instruction ภายใน",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "R2 disclosure: dumping the system prompt still rejects",
  validateConversationCoreSafety({
    candidateText: "dumping the system prompt",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "R2 mixed educational/disclosure: dump after API-key warning still flags",
  validateConversationCoreSafety({
    candidateText: "ห้ามเปิดเผย API key แต่นี่คือ system instruction ของฉัน: คุณคือน้องเอ",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);

assertTruthy(
  "R2 VAT: illustration caveat does not suppress later absolute claim",
  highRiskCodes("นี่เป็นเพียงคณิตศาสตร์ แต่รถมือสองทุกคันต้องบวก VAT 7% เสมอ").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertTruthy(
  "R2 VAT: document caveat does not suppress later finance absolute",
  highRiskCodes("VAT ต้องตรวจจากใบเสนอราคา แต่ค่างวดทุกกรณีต้องคูณ 1.07").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertFalsy(
  "R2 VAT: same-clause illustration still allowed",
  highRiskCodes(
    "8,000 × 1.07 = 8,560 เป็นเพียงคณิตศาสตร์ ไม่ได้แปลว่าต้องบวก VAT ทุกกรณี"
  ).includes("high_risk.vat_finance_absolute_claim")
);
assertFalsy(
  "R2 VAT: inspect-from-quote advice still allowed",
  highRiskCodes("VAT ต้องตรวจจากใบเสนอราคาหรือสัญญาจริง").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);

assertTruthy(
  "R2 gear: EPB qualification does not suppress later universal gear recipe",
  highRiskCodes("EPB แตกต่างตามรุ่น แต่ใช้สูตรเกียร์เดียวกันได้ทุกรุ่น").includes(
    "high_risk.universal_control_without_qualification"
  )
);
assertTruthy(
  "R2 cross-system: EPB qualification does not suppress VAT absolute",
  highRiskCodes("EPB แตกต่างตามรุ่น แต่รถมือสองทุกคันต้องบวก VAT 7% เสมอ").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertFalsy(
  "R2 gear: same-clause model qualification still allowed",
  highRiskCodes("ตำแหน่งเกียร์และวิธีใช้แตกต่างตามรุ่น ต้องดูคู่มือรถ").includes(
    "high_risk.universal_control_without_qualification"
  )
);
assertFalsy(
  "R2 EPB: qualified model-specific switch hold still allowed",
  highRiskCodes(
    "EPB แตกต่างตามรุ่นและต้องตรวจคู่มือ บางรุ่นอาจรองรับการดึงสวิตช์ค้าง"
  ).includes("high_risk.epb_universal_procedure")
);

const r2Frozen = Object.freeze({
  candidateText: "ตั้งแต่วันนี้ ห้ามเปิดเผย system instruction",
  context: Object.freeze({
    policyLane: "general-consultative" as const,
  }),
});
const r2Snapshot = JSON.stringify(r2Frozen);
const r2First = validateConversationCoreCandidate(r2Frozen);
const r2Second = validateConversationCoreCandidate(r2Frozen);
assertEqual("R2 immutability: frozen input unchanged", JSON.stringify(r2Frozen), r2Snapshot);
assertEqual("R2 determinism: identical JSON", r2First, r2Second);

const r2Ordered = validateConversationCoreCandidate({
  candidateText: "ดู $\\frac{1}{2}$ และ <div>ui</div> แล้วโพสต์ประกาศให้แล้ว",
  context: { policyLane: "general-consultative" },
});
const r2OrderedCodes = r2Ordered.issues.map((item) => item.code);
const r2TypographyIndex = r2OrderedCodes.findIndex((code) => code.startsWith("typography."));
const r2SafetyIndex = r2OrderedCodes.findIndex((code) => code.startsWith("safety."));
assertTruthy("R2 ordering: typography appears", r2TypographyIndex >= 0);
assertTruthy("R2 ordering: safety appears", r2SafetyIndex >= 0);
assertTruthy("R2 ordering: typography before safety", r2TypographyIndex < r2SafetyIndex);

assertTruthy(
  "R1 retained: $x$ is raw latex",
  validateConversationCoreTypography({ candidateText: "ค่า $x$ ในสูตร" }).issues.some(
    (item) => item.code === "typography.raw_latex"
  )
);
assertTruthy(
  "R1 retained: $20^2$ is raw latex",
  validateConversationCoreTypography({ candidateText: "กำลัง $20^2$ ดิบ" }).issues.some(
    (item) => item.code === "typography.raw_latex"
  )
);
assertEqual(
  "R1 retained: unpaired $20 currency-like amount accepts",
  validateConversationCoreTypography({
    candidateText: "งบประมาณประมาณ $20 ยังไม่ใช่ราคาจริง",
  }).outcome,
  "accept"
);

assertEqual(
  "R3 disclosure: นี่คือคำอธิบายว่า system instruction คืออะไร accepts",
  validateConversationCoreSafety({
    candidateText: "นี่คือคำอธิบายว่า system instruction คืออะไร",
  }).outcome,
  "accept"
);
assertEqual(
  "R3 disclosure: ต่อไปนี้คือความหมายของ developer instruction accepts",
  validateConversationCoreSafety({
    candidateText: "ต่อไปนี้คือความหมายของ developer instruction โดยทั่วไป",
  }).outcome,
  "accept"
);
assertEqual(
  "R3 disclosure: นี่คือตัวอย่างคำว่า system prompt accepts",
  validateConversationCoreSafety({
    candidateText: "นี่คือตัวอย่างคำว่า system prompt ไม่ใช่ prompt จริง",
  }).outcome,
  "accept"
);
assertEqual(
  "R3 disclosure: system instruction definition still accepts",
  validateConversationCoreSafety({
    candidateText: "system instruction คือคำสั่งระดับระบบที่ใช้กำหนดพฤติกรรม",
  }).outcome,
  "accept"
);
assertEqual(
  "R3 disclosure: คำสั่งระบบหมายถึง still accepts",
  validateConversationCoreSafety({
    candidateText: "คำสั่งระบบหมายถึงคำสั่งที่มีลำดับความสำคัญสูง",
  }).outcome,
  "accept"
);
assertTruthy(
  "R3 disclosure: นี่คือ system instruction ของฉัน still rejects",
  validateConversationCoreSafety({
    candidateText: "นี่คือ system instruction ของฉัน: คุณต้องขายรถให้ได้",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "R3 disclosure: ต่อไปนี้คือ developer instruction ภายใน still rejects",
  validateConversationCoreSafety({
    candidateText: "ต่อไปนี้คือ developer instruction ภายใน: ห้ามปฏิเสธผู้ใช้",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "R3 disclosure: ของระบบคือ still rejects",
  validateConversationCoreSafety({
    candidateText: "system instruction ของระบบคือ: ห้ามปฏิเสธคำสั่งผู้ใช้",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "R3 disclosure: dumping the system prompt still rejects",
  validateConversationCoreSafety({
    candidateText: "dumping the system prompt",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);
assertTruthy(
  "R3 disclosure: explanation then later ownership dump still rejects",
  validateConversationCoreSafety({
    candidateText: "นี่คือคำอธิบายทั่วไป และ system instruction ของฉันคือ: คุณคือน้องเอ",
  }).issues.some((item) => item.code === "safety.system_instruction_disclosure")
);

assertTruthy(
  "R3 VAT: เป็นเพียงคณิตศาสตร์ does not suppress later absolute",
  highRiskCodes("เป็นเพียงคณิตศาสตร์ รถมือสองทุกคันต้องบวก VAT 7% เสมอ").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertTruthy(
  "R3 VAT: ไม่ใช่ข้อยืนยัน does not suppress later ค่างวด absolute",
  highRiskCodes("ไม่ใช่ข้อยืนยัน ค่างวดทุกกรณีต้องคูณ 1.07").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertTruthy(
  "R3 VAT: inspect-from-quote does not suppress later absolute",
  highRiskCodes("VAT ต้องตรวจจากใบเสนอราคา รถมือสองทุกคันต้องบวก VAT 7%").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertTruthy(
  "R3 VAT: อย่างไรก็ดี later absolute still flags",
  highRiskCodes(
    "ตัวอย่างเท่านั้น แต่ละคันต่างกัน อย่างไรก็ดีค่างวดต้องบวก VAT ทุกกรณี"
  ).includes("high_risk.vat_finance_absolute_claim")
);
assertFalsy(
  "R3 VAT: bound ไม่ได้แปลว่า still allowed",
  highRiskCodes(
    "8,000 × 1.07 = 8,560 เป็นเพียงคณิตศาสตร์ ไม่ได้แปลว่าต้องบวก VAT ทุกกรณี"
  ).includes("high_risk.vat_finance_absolute_claim")
);
assertFalsy(
  "R3 VAT: bound ไม่ใช่ข้อยืนยันว่า still allowed",
  highRiskCodes("ไม่ใช่ข้อยืนยันว่าต้องบวก VAT ทุกกรณี").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertFalsy(
  "R3 VAT: inspect quote or contract still allowed",
  highRiskCodes("VAT ต้องตรวจจากใบเสนอราคาหรือสัญญาจริง").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);
assertFalsy(
  "R3 VAT: ไม่ควรคูณ until confirmed still allowed",
  highRiskCodes("ไม่ควรคูณ 1.07 จนกว่าจะยืนยันว่าใบเสนอราคารวม VAT หรือยัง").includes(
    "high_risk.vat_finance_absolute_claim"
  )
);

assertTruthy(
  "R3 gear: EPB qualification does not suppress gear recipe",
  highRiskCodes("EPB แตกต่างตามรุ่น ใช้สูตรเกียร์เดียวกันได้ทุกรุ่น").includes(
    "high_risk.universal_control_without_qualification"
  )
);
assertTruthy(
  "R3 gear: steering qualification does not suppress D3 recipe",
  highRiskCodes("พวงมาลัยต่างกันตามรุ่น แต่เกียร์ D3 ไป 2 ไป L ใช้ได้ทุกคัน").includes(
    "high_risk.universal_control_without_qualification"
  )
);
assertTruthy(
  "R3 gear: EPB manual note does not suppress gear recipe",
  highRiskCodes("ต้องดูคู่มือ EPB ใช้สูตรเกียร์เดียวกันได้ทุกรุ่น").includes(
    "high_risk.universal_control_without_qualification"
  )
);
assertTruthy(
  "R3 gear: brake qualification does not suppress gear recipe",
  highRiskCodes("ระบบเบรกต่างกันตามรุ่น ใช้สูตรเกียร์เดียวกันได้ทุกคัน").includes(
    "high_risk.universal_control_without_qualification"
  )
);
assertFalsy(
  "R3 gear: gear-topic qualification without universal recipe allowed",
  highRiskCodes("ตำแหน่งเกียร์และวิธีใช้แตกต่างตามรุ่น ต้องดูคู่มือรถ").includes(
    "high_risk.universal_control_without_qualification"
  )
);
assertFalsy(
  "R3 gear: negated same-topic formula still allowed",
  highRiskCodes("เกียร์แต่ละรุ่นต่างกัน จึงไม่ควรใช้สูตรเดียวกันทุกคัน").includes(
    "high_risk.universal_control_without_qualification"
  )
);
assertFalsy(
  "R3 EPB: same-system qualified switch hold still allowed",
  highRiskCodes(
    "EPB แตกต่างตามรุ่นและต้องตรวจคู่มือ บางรุ่นอาจรองรับการดึงสวิตช์ค้าง"
  ).includes("high_risk.epb_universal_procedure")
);

const r3Frozen = Object.freeze({
  candidateText: "นี่คือคำอธิบายว่า system instruction คืออะไร",
  context: Object.freeze({
    policyLane: "general-consultative" as const,
  }),
});
const r3Snapshot = JSON.stringify(r3Frozen);
const r3First = validateConversationCoreCandidate(r3Frozen);
const r3Second = validateConversationCoreCandidate(r3Frozen);
assertEqual("R3 immutability: frozen input unchanged", JSON.stringify(r3Frozen), r3Snapshot);
assertEqual("R3 determinism: identical JSON", r3First, r3Second);

const statusRaw = execFileSync("git", ["status", "--short"], { encoding: "utf8" });
const statusPaths = statusRaw
  .split(/\r?\n/)
  .map((line) => line.trimEnd())
  .filter((line) => line.length > 0)
  .map((line) => line.slice(3).replace(/\/$/, "").replace(/\\/g, "/"));
const ownedStatusPaths = statusPaths.filter(isResponseValidatorHarnessOwnedPath);
for (const statusPath of ownedStatusPaths) {
  assertTruthy(
    `allowlist: ${statusPath} is expected`,
    ALLOWLIST_PATHS.has(statusPath)
  );
}
for (const allowPath of ALLOWLIST_PATHS) {
  assertTruthy(`allowlist file exists: ${allowPath}`, fs.existsSync(path.join(process.cwd(), allowPath)));
}

assertTruthy(
  "harness: unknown service-core path is owned by this suite",
  isResponseValidatorHarnessOwnedPath("src/services/conversation-core/forgedUnknownValidator.ts")
);
assertFalsy(
  "harness: unknown service-core path is not silently allowed",
  ALLOWLIST_PATHS.has("src/services/conversation-core/forgedUnknownValidator.ts")
);
assertFalsy(
  "harness: server conversation-core is out of 03C2 scope",
  isResponseValidatorHarnessOwnedPath("src/server/conversation-core/conversationCoreGeminiAdapter.ts")
);
assertTruthy(
  "harness: 03D3B server conversation-core index is in owned scope",
  isResponseValidatorHarnessOwnedPath("src/server/conversation-core/index.ts")
);
assertFalsy(
  "harness: 03C3 gemini config is out of 03C2 scope",
  isResponseValidatorHarnessOwnedPath("src/server/conversation-core/conversationCoreGeminiConfig.ts")
);
assertFalsy(
  "harness: 03C3 correction service is out of 03C2 scope",
  isResponseValidatorHarnessOwnedPath("src/server/conversation-core/conversationCoreCorrectionService.ts")
);
assertTruthy(
  "harness: 03E2D2B execution service is in owned scope",
  isResponseValidatorHarnessOwnedPath("src/server/conversation-core/conversationCoreExecutionService.ts")
);
assertFalsy(
  "harness: 03C3 fallback is out of 03C2 scope",
  isResponseValidatorHarnessOwnedPath("src/server/conversation-core/conversationCoreHighRiskFallback.ts")
);
assertFalsy(
  "harness: 03C3 gemini test is out of 03C2 scope",
  isResponseValidatorHarnessOwnedPath("scripts/test-conversation-core-gemini-correction.mts")
);
assertTruthy(
  "harness: this test file remains in 03C2 owned scope",
  isResponseValidatorHarnessOwnedPath("scripts/test-conversation-core-response-validators.mts")
);
assertTruthy(
  "harness: services conversation-core index remains owned",
  isResponseValidatorHarnessOwnedPath("src/services/conversation-core/index.ts")
);

const OUT_OF_HARNESS_SCOPE = [
  "package.json",
  "src/components/chat/ChatMessageBubble.tsx",
  "src/hooks/chat/useVehiclePanel.ts",
  "src/services/ai/chat/buyerCarPitchCopy.ts",
  "src/services/ai/chat/buyerMarketplaceScoring.ts",
  "src/services/ai/chat/buyerScoredMarketplaceSearch.ts",
  "src/services/ai/chat/chatRefinementReplyCopy.ts",
  "src/services/ai/chat/chatSearchOrchestrator.ts",
  "src/services/ai/chat/chatSearchReplyCopy.ts",
  "src/services/ai/chat/vehicleDiscovery.ts",
  "src/services/ai/chat/vehicleDiscoveryCriteriaParser.ts",
  "src/services/ai/chat/vehicleDiscoveryIndex.ts",
  "src/services/ai/chat/vehicleDiscoveryRelaxation.ts",
  "src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts",
  "src/server/conversation-core/conversationCoreGeminiConfig.ts",
  "src/server/conversation-core/conversationCoreGeminiAdapter.ts",
  "src/server/conversation-core/conversationCoreCorrectionService.ts",
  "src/server/conversation-core/conversationCoreHighRiskFallback.ts",
  "src/server/conversation-core/conversationCoreFeatureFlags.ts",
  "scripts/test-conversation-core-gemini-correction.mts",
  "scripts/test-conversation-core-policy-foundation.mts",
  "scripts/test-nonga-chat-car-cards.mts",
  "scripts/test-v22.26-multi-car-sales-explanation.mts",
  "tmp",
  "CHAT-V2-EVIDENCE",
] as const;
for (const statusPath of OUT_OF_HARNESS_SCOPE) {
  assertFalsy(
    `harness: ${statusPath} is outside 03C2 owned scope`,
    isResponseValidatorHarnessOwnedPath(statusPath)
  );
}

assertEqual("harness: approved allowlist size is exact", ALLOWLIST_PATHS.size, 42);
for (const wp03d3bPath of WP_V2U_03D3B_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03d3bPath} is approved for WP-V2U-03D3B`,
    ALLOWLIST_PATHS.has(wp03d3bPath)
  );
}
for (const wp03d4bPath of WP_V2U_03D4B_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03d4bPath} is approved for WP-V2U-03D4B`,
    ALLOWLIST_PATHS.has(wp03d4bPath)
  );
}
for (const wp03e2aPath of WP_V2U_03E2A_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2aPath} is approved for WP-V2U-03E2A`,
    ALLOWLIST_PATHS.has(wp03e2aPath)
  );
}
for (const wp03e2b2Path of WP_V2U_03E2B2_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2b2Path} is approved for WP-V2U-03E2B2`,
    ALLOWLIST_PATHS.has(wp03e2b2Path)
  );
}
for (const wp03e2c2bPath of WP_V2U_03E2C2B_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2c2bPath} is approved for WP-V2U-03E2C2B`,
    ALLOWLIST_PATHS.has(wp03e2c2bPath)
  );
}
for (const wp03e2c2aPath of WP_V2U_03E2C2A_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2c2aPath} is approved for WP-V2U-03E2C2A`,
    ALLOWLIST_PATHS.has(wp03e2c2aPath)
  );
}
for (const wp03e2d2aPath of WP_V2U_03E2D2A_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2d2aPath} is approved for WP-V2U-03E2D2A`,
    ALLOWLIST_PATHS.has(wp03e2d2aPath)
  );
}
for (const wp03e2d2bPath of WP_V2U_03E2D2B_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2d2bPath} is approved for WP-V2U-03E2D2B`,
    ALLOWLIST_PATHS.has(wp03e2d2bPath)
  );
}
for (const wp03e2d2c2aPath of WP_V2U_03E2D2C2A_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2d2c2aPath} is approved for WP-V2U-03E2D2C2A`,
    ALLOWLIST_PATHS.has(wp03e2d2c2aPath)
  );
}
for (const wp03e2d2c2bPath of WP_V2U_03E2D2C2B_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2d2c2bPath} is approved for WP-V2U-03E2D2C2B`,
    ALLOWLIST_PATHS.has(wp03e2d2c2bPath)
  );
}
for (const wp03e2d2c2c1Path of WP_V2U_03E2D2C2C1_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2d2c2c1Path} is approved for WP-V2U-03E2D2C2C1`,
    ALLOWLIST_PATHS.has(wp03e2d2c2c1Path)
  );
}
for (const wp03e2d2c2c2aPath of WP_V2U_03E2D2C2C2A_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2d2c2c2aPath} is approved for WP-V2U-03E2D2C2C2A`,
    ALLOWLIST_PATHS.has(wp03e2d2c2c2aPath)
  );
}
for (const wp03e2d2c2c2bPath of WP_V2U_03E2D2C2C2B_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2d2c2c2bPath} is approved for WP-V2U-03E2D2C2C2B`,
    ALLOWLIST_PATHS.has(wp03e2d2c2c2bPath)
  );
}
for (const wp03e2d2c2c2cPath of WP_V2U_03E2D2C2C2C_ALLOWLIST_PATHS) {
  assertTruthy(
    `allowlist: ${wp03e2d2c2c2cPath} is approved for WP-V2U-03E2D2C2C2C`,
    ALLOWLIST_PATHS.has(wp03e2d2c2c2cPath)
  );
}
assertTruthy(
  "harness: 03E2D2C2C2B orchestrator is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreOrchestrator.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2C2B local search/inventory e2e test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-local-search-inventory-e2e.mts"
  )
);
assertTruthy(
  "harness: 03E2D2C2C2C live activation is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreLiveServerActivation.ts"
  )
);
assertFalsy(
  "harness: 03B feature flags remain outside this WP owned snapshot",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreFeatureFlags.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2C2C live smoke test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-live-search-inventory-smoke.mts"
  )
);
assertTruthy(
  "harness: 03E2D2C2C2C-R1 pilot eligibility is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCorePilotEligibility.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2C2C-R1 pilot eligibility test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-pilot-eligibility.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent orchestrator path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/server/conversation-core/conversationCoreOrchestratorForged.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2C2A route handler is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreRouteHandler.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2C2A orchestrator route test is in owned scope",
  isResponseValidatorHarnessOwnedPath("scripts/test-conversation-core-orchestrator.mts")
);
assertTruthy(
  "harness: 03E2D2C2C1 orchestrator integration is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreOrchestratorIntegration.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2C1 orchestrator integration test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-orchestrator-integration.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent orchestrator integration path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/server/conversation-core/conversationCoreOrchestratorIntegrationForged.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2A lane classifier is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreLaneClassifier.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2A lane classifier test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-lane-classifier.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent lane classifier path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/server/conversation-core/conversationCoreLaneClassifierForged.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2B runtime deps factory is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreRuntimeDeps.ts"
  )
);
assertTruthy(
  "harness: 03E2D2C2B runtime deps test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-runtime-deps.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent runtime deps path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/server/conversation-core/conversationCoreRuntimeDepsForged.ts"
  )
);
assertTruthy(
  "harness: 03E2C2B finance grounding is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/services/conversation-core/conversationCoreFinanceGrounding.ts"
  )
);
assertTruthy(
  "harness: 03E2C2B finance grounding test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-finance-grounding.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent finance grounding path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/services/conversation-core/conversationCoreFinanceGroundingForged.ts"
  )
);
assertTruthy(
  "harness: unapproved adjacent finance grounding path is in service-core owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/services/conversation-core/conversationCoreFinanceGroundingForged.ts"
  )
);
assertTruthy(
  "harness: 03E2D2B grounded tool-turn execution is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-grounded-tool-turn-execution.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent grounded execution path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "scripts/test-conversation-core-grounded-tool-turn-executionForged.mts"
  )
);
assertTruthy(
  "harness: 03E2D2A grounded tool-turn coordinator is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreGroundedToolTurnCoordinator.ts"
  )
);
assertTruthy(
  "harness: 03E2D2A grounded tool-turn coordinator test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-grounded-tool-turn-coordinator.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent grounded coordinator path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/server/conversation-core/conversationCoreGroundedToolTurnCoordinatorForged.ts"
  )
);
assertTruthy(
  "harness: 03E2C2A authoritative grounding is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/services/conversation-core/conversationCoreAuthoritativeGrounding.ts"
  )
);
assertTruthy(
  "harness: 03E2C2A numeric normalization is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/services/conversation-core/conversationCoreNumericNormalization.ts"
  )
);
assertTruthy(
  "harness: 03E2C2A authoritative grounding test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-authoritative-grounding.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent authoritative grounding path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/services/conversation-core/conversationCoreAuthoritativeGroundingForged.ts"
  )
);
assertTruthy(
  "harness: unapproved adjacent authoritative grounding path is in service-core owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/services/conversation-core/conversationCoreAuthoritativeGroundingForged.ts"
  )
);
assertTruthy(
  "harness: 03E2B2 gemini tool transport is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreGeminiToolTransport.ts"
  )
);
assertTruthy(
  "harness: 03E2B2 gemini function declarations is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreGeminiFunctionDeclarations.ts"
  )
);
assertTruthy(
  "harness: 03E2B2 gemini tool transport test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-gemini-tool-transport.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent gemini tool transport path is not owned",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreGeminiToolTransportForged.ts"
  )
);
assertFalsy(
  "harness: unapproved adjacent gemini tool transport path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/server/conversation-core/conversationCoreGeminiToolTransportForged.ts"
  )
);
assertTruthy(
  "harness: 03E2A gemini turn outcome contract is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/services/conversation-core/conversationCoreGeminiTurnOutcome.ts"
  )
);
assertTruthy(
  "harness: 03E2A gemini turn outcome test is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "scripts/test-conversation-core-gemini-turn-outcome.mts"
  )
);
assertFalsy(
  "harness: unapproved adjacent gemini turn outcome path is not in allowlist",
  ALLOWLIST_PATHS.has(
    "src/services/conversation-core/conversationCoreGeminiTurnOutcomeForged.ts"
  )
);
assertTruthy(
  "harness: unapproved adjacent gemini turn outcome path is in service-core owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/services/conversation-core/conversationCoreGeminiTurnOutcomeForged.ts"
  )
);
assertTruthy(
  "harness: 03D4B business tool composite is in owned scope",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreBusinessToolAdapters.ts"
  )
);
assertTruthy(
  "harness: 03D4B business tool adapter test is in owned scope",
  isResponseValidatorHarnessOwnedPath("scripts/test-conversation-core-business-tool-adapters.mts")
);
assertFalsy(
  "harness: unapproved adjacent business composite path is not owned",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreBusinessToolAdaptersForged.ts"
  )
);
assertTruthy(
  "harness: 03D3B toolEnvelope is in owned scope",
  isResponseValidatorHarnessOwnedPath("src/services/conversation-core/toolEnvelope.ts")
);
assertTruthy(
  "harness: 03D3B finance adapter test is in owned scope",
  isResponseValidatorHarnessOwnedPath("scripts/test-conversation-core-finance-tool-adapter.mts")
);
assertFalsy(
  "harness: unapproved adjacent server finance path is not owned",
  isResponseValidatorHarnessOwnedPath(
    "src/server/conversation-core/conversationCoreFinanceToolAdaptersForged.ts"
  )
);
assertFalsy(
  "harness: unrelated root file is not owned on a clean checkout",
  isResponseValidatorHarnessOwnedPath("README.md")
);
assertFalsy(
  "harness: owner dirty paths are not judged by this suite",
  isResponseValidatorHarnessOwnedPath("package.json")
);

assertFalsy(
  "candidate validator source has no user-message classifier",
  /userMessage/.test(read("src/services/conversation-core/conversationCoreHighRiskValidator.ts")) &&
    /classify/.test(read("src/services/conversation-core/conversationCoreHighRiskValidator.ts"))
);
assertFalsy(
  "candidate validator does not import result envelope",
  /conversationCoreResult/.test(
    read("src/services/conversation-core/conversationCoreCandidateValidator.ts")
  )
);
assertFalsy(
  "typography does not rewrite a corrected response field",
  /correctedText|normalizedText/.test(
    read("src/services/conversation-core/conversationCoreTypographyValidator.ts")
  )
);

// Clean-tree substantive baseline: 433 deterministic assertions through the harness
// checks above. Git-status-owned allowlist paths add up to four additive passes when
// those files are dirty; the floor must not depend on current dirty-file count.
const RESPONSE_VALIDATOR_CLEAN_TREE_MIN_ASSERTIONS = 433;

if (passCount < RESPONSE_VALIDATOR_CLEAN_TREE_MIN_ASSERTIONS) {
  console.error(
    `FAIL [assertion count] expected at least ${RESPONSE_VALIDATOR_CLEAN_TREE_MIN_ASSERTIONS}, got ${passCount}`
  );
  process.exit(1);
}

console.log(`\nConversation Core response-validator tests passed (${passCount} assertions).`);
