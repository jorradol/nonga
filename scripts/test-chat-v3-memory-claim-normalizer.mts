/**
 * WP-NVB-02E — Narrow V.3 durable-memory claim normalizer tests.
 * Pure / deterministic. No provider or network.
 */
import { readFileSync } from "node:fs";
import { normalizeChatV3UnsupportedDurableMemoryClaims } from "../src/services/ai/chat-v3/chatV3MemoryClaimNormalizer.ts";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
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

const DURABLE_CLAIM_RE =
  /จำใส่เมมโมรี่ไว้เรียบร้อยแล้ว|เซฟข้อมูลไว้แล้ว|บันทึกไว้ในระบบแล้ว|จำถาวรแล้ว|ไม่มีลืมแน่นอน/;
const SESSION_SCOPE_RE = /ในบทสนทนานี้/;
const PREFERENCE = "ใช้รถในเมืองและชอบเกียร์ออโต้";

const instruction = readFileSync(
  "src/services/ai/chat-v3/chatV3SystemInstruction.ts",
  "utf8"
);
const service = readFileSync(
  "src/services/ai/chat-v3/chatV3ConversationService.ts",
  "utf8"
);
const normalizer = readFileSync(
  "src/services/ai/chat-v3/chatV3MemoryClaimNormalizer.ts",
  "utf8"
);

console.log("=== WP-NVB-02E Memory Claim Normalizer ===\n");

const ownerLike = normalizeChatV3UnsupportedDurableMemoryClaims(
  `จำใส่เมมโมรี่ไว้เรียบร้อยแล้ว ว่าลุง${PREFERENCE}`
);
assertTruthy("1: Owner-like claim normalized", SESSION_SCOPE_RE.test(ownerLike));
assertFalsy("1b: Owner-like durable claim removed", DURABLE_CLAIM_RE.test(ownerLike));
assertTruthy("5: preference preserved (city+auto)", ownerLike.includes(PREFERENCE));
assertTruthy("6: current-conversation scope", ownerLike.includes("ในบทสนทนานี้"));
assertFalsy("7: no durable-save claim remains", DURABLE_CLAIM_RE.test(ownerLike));

const saved = normalizeChatV3UnsupportedDurableMemoryClaims(
  `เซฟข้อมูลไว้แล้ว ว่าลุง${PREFERENCE}`
);
assertTruthy("2: เซฟข้อมูลไว้แล้ว normalized", SESSION_SCOPE_RE.test(saved));
assertFalsy("2b: เซฟ claim removed", /เซฟข้อมูลไว้แล้ว/.test(saved));
assertTruthy("2c: preference kept", saved.includes(PREFERENCE));

const systemSaved = normalizeChatV3UnsupportedDurableMemoryClaims(
  `บันทึกไว้ในระบบแล้ว ว่าลุง${PREFERENCE}`
);
assertTruthy("3: บันทึกไว้ในระบบแล้ว normalized", SESSION_SCOPE_RE.test(systemSaved));
assertFalsy("3b: system-save claim removed", /บันทึกไว้ในระบบแล้ว/.test(systemSaved));

const neverForget = normalizeChatV3UnsupportedDurableMemoryClaims(
  `ไม่มีลืมแน่นอน ว่าลุง${PREFERENCE}`
);
assertTruthy("4: ไม่มีลืมแน่นอน normalized", SESSION_SCOPE_RE.test(neverForget));
assertFalsy("4b: never-forget claim removed", /ไม่มีลืมแน่นอน/.test(neverForget));
assertTruthy("4c: preference kept", neverForget.includes(PREFERENCE));

const question = "ระบบนี้มีเมมโมรี่ไหม";
assertEqual(
  "8: memory question unchanged",
  normalizeChatV3UnsupportedDurableMemoryClaims(question),
  question
);

const hypothetical = "ถ้าบันทึกข้อมูลได้จะทำอย่างไร";
assertEqual(
  "9: hypothetical discussion unchanged",
  normalizeChatV3UnsupportedDurableMemoryClaims(hypothetical),
  hypothetical
);

const thirdPerson = "ระบบนี้สามารถบันทึกความชอบของผู้ใช้ได้ในอนาคต";
assertEqual(
  "10: third-person explanation unchanged",
  normalizeChatV3UnsupportedDurableMemoryClaims(thirdPerson),
  thirdPerson
);

const normal = "เบรกคือระบบชะลอและหยุดรถครับ กดแป้นแล้วแรงถูกส่งไปที่ล้อ";
assertEqual(
  "11: normal response unchanged",
  normalizeChatV3UnsupportedDurableMemoryClaims(normal),
  normal
);

const trustedClaim = `จำใส่เมมโมรี่ไว้เรียบร้อยแล้ว ว่าลุง${PREFERENCE}`;
assertEqual(
  "12: trusted durable-write leaves completed claim",
  normalizeChatV3UnsupportedDurableMemoryClaims(trustedClaim, {
    authoritativeDurableWriteSucceeded: true,
  }),
  trustedClaim
);

assertEqual(
  "13: empty string safe",
  normalizeChatV3UnsupportedDurableMemoryClaims(""),
  ""
);
assertEqual(
  "13b: malformed non-string safe",
  normalizeChatV3UnsupportedDurableMemoryClaims(undefined as unknown as string),
  ""
);

assertFalsy("14: normalizer has no fetch", /fetch\(/.test(normalizer));
assertFalsy("14b: normalizer has no provider.generate", normalizer.includes("provider.generate"));
assertTruthy(
  "14c: conversation service applies normalizer",
  service.includes("normalizeChatV3UnsupportedDurableMemoryClaims")
);

assertTruthy(
  "15: system instruction has session-only rule",
  instruction.includes("[บริบทการสนทนา — ไม่ใช่ความจำถาวร]") &&
    instruction.includes("ประวัติที่ส่งมาเป็นบริบทจำกัดของบทสนทนาปัจจุบันเท่านั้น")
);
assertTruthy(
  "15b: instruction forbids durable-save claims without a write",
  instruction.includes("ห้ามอ้างว่าบันทึกโปรไฟล์") &&
    instruction.includes("ไม่มีเครื่องมือหรือผลเขียนความจำถาวร")
);
assertTruthy(
  "15c: history bounds unchanged in instruction file",
  !instruction.includes("GENERAL_BRIDGE_MAX_HISTORY_MESSAGES")
);

console.log(`\n=== ${passCount} passed ===`);
