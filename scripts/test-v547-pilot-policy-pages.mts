/**
 * v5.4.7c — pilot policy pages (terms / privacy / listing)
 * npm run test:v547-pilot-policy-pages
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PILOT_POLICY_DISCLAIMER,
  PILOT_POLICY_DOCUMENTS,
  PILOT_POLICY_PATHS,
  PILOT_POLICY_SLUGS,
} from "../src/content/pilotPolicyContent.ts";
import {
  resolvePilotPolicySlug,
  resolveViewFromPathname,
} from "../src/utils/appRouteSync.ts";
import {
  detectHelpOnboardingTopic,
  buildHelpOnboardingReply,
  tryHelpOnboardingReply,
} from "../src/services/ai/chat/chatHelpOnboardingTemplates.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { isPublicSignupEnabled } from "../src/services/auth/authService.ts";

const ROOT = resolve(import.meta.dirname, "..");

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.4.7c pilot policy pages ===\n");

for (const slug of PILOT_POLICY_SLUGS) {
  const doc = PILOT_POLICY_DOCUMENTS[slug];
  ok(`doc-${slug}-title`, doc.title.length > 5, doc.title);
  ok(`doc-${slug}-sections`, doc.sections.length >= 3, String(doc.sections.length));
}

const allContent = PILOT_POLICY_SLUGS.map(
  (s) => PILOT_POLICY_DOCUMENTS[s].title + JSON.stringify(PILOT_POLICY_DOCUMENTS[s].sections)
).join("\n");

ok("disclaimer-not-pdpa-complete", /ไม่ใช่เอกสารกฎหมาย|PDPA ฉบับสมบูรณ์/.test(PILOT_POLICY_DISCLAIMER), "");
ok("disclaimer-legal-review", /ผู้เชี่ยวชาญ|ตรวจทาน/.test(PILOT_POLICY_DISCLAIMER), "");

ok("terms-closed-pilot", /closed pilot|รอบทดลอง|ได้รับเชิญ/.test(allContent), "");
ok("terms-no-sale-guarantee", /ไม่รับประกันว่าจะขายรถได้/.test(PILOT_POLICY_DOCUMENTS.terms.sections.flatMap((s) => s.bullets ?? []).join("\n")), "");
ok("terms-seller-verify", /ตรวจสอบข้อมูล/.test(allContent), "");
ok("listing-seller-responsible", /ผู้ขายรับผิดชอบ/.test(PILOT_POLICY_DOCUMENTS.listing.sections.flatMap((s) => s.bullets ?? []).join("\n")), "");
ok("listing-3-core-photos", /3 มุม|หน้ารถ/.test(PILOT_POLICY_DOCUMENTS.listing.sections.flatMap((s) => s.bullets ?? []).join("\n")), "");
ok("listing-optional-trust", /ไม่บังคับ|น่าเชื่อถือ/.test(PILOT_POLICY_DOCUMENTS.listing.sections.flatMap((s) => s.bullets ?? []).join("\n")), "");
ok("privacy-doc-warning", /เอกสาร|ใบหน้า|ป้ายทะเบียน/.test(PILOT_POLICY_DOCUMENTS.privacy.sections.flatMap((s) => s.bullets ?? []).join("\n")), "");
ok("no-legal-mandate-claim", !/ข้อมูลตามกฎหมายกำหนด/.test(allContent), allContent.slice(0, 120));
ok("no-guarantee-all-accuracy", !/รับประกันความถูกต้องทั้งหมด/.test(allContent), "");
ok(
  "listing-vision-must-not-assert",
  /ไม่ควรฟันธง|ไม่.*ฟันธง/.test(
    PILOT_POLICY_DOCUMENTS.listing.sections.flatMap((s) => s.bullets ?? []).join("\n")
  ),
  ""
);

for (const slug of PILOT_POLICY_SLUGS) {
  const path = PILOT_POLICY_PATHS[slug];
  ok(`route-${slug}`, resolveViewFromPathname(path) === "pilot-policy", path);
  ok(`slug-${slug}`, resolvePilotPolicySlug(path) === slug, path);
}

const appTsx = readSrc("src/App.tsx");
ok("footer-terms-link", /navigatePilotPolicy\("terms"/.test(appTsx), "");
ok("footer-privacy-link", /navigatePilotPolicy\("privacy"/.test(appTsx), "");
ok("footer-listing-link", /navigatePilotPolicy\("listing"/.test(appTsx), "");
ok("app-pilot-policy-view", /case "pilot-policy"/.test(appTsx), "");
ok("component-exists", readSrc("src/components/policy/PilotPolicyPageView.tsx").includes("PilotPolicyPageView"), "");

const loginView = readSrc("src/components/auth/LoginView.tsx");
ok("login-policy-link", /navigatePilotPolicy\("terms"/.test(loginView), "");

ok("help-policy-detect", detectHelpOnboardingTopic("นโยบายคืออะไร") === "policyInfo", "");
ok("help-privacy-detect", detectHelpOnboardingTopic("ข้อมูลปลอดภัยไหม") === "policyInfo", "");
const policyBody = buildHelpOnboardingReply("policyInfo");
ok("help-policy-paths", /\/policy\/terms/.test(policyBody) && /\/policy\/privacy/.test(policyBody), "");
ok("help-no-sale-guarantee", /ไม่รับประกันขายได้/.test(policyBody), "");
const policyOrch = tryOrchestrateChatReply("นโยบายคืออะไร", []);
ok("help-policy-skip", policyOrch?.skipGemini === true, "");
ok("help-policy-no-cards", (policyOrch?.carCards.length ?? 0) === 0, "");

ok("public-signup-disabled", isPublicSignupEnabled() === false, "");

const existingHelp = tryHelpOnboardingReply("ใช้งานยังไง");
ok("existing-help-still", existingHelp != null && existingHelp.skipGemini, "");

console.log("\n=== v5.4.7c pilot policy pages — done ===\n");
