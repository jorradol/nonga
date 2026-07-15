/**
 * Car Post Generator — P0 Hosting-only Honesty Gate
 *
 * A. real success → posts returned; quota may be deducted
 * B. isMock=true → error, not success UI path, no quota
 * C. request/generate failure → error, no quota
 *
 * Run: npx tsx scripts/test-car-post-generator-honesty-gate.mts
 */
import fs from "node:fs";
import path from "node:path";
import {
  evaluatePostGenerateHonesty,
  shouldDeductPostGenerationQuota,
  POST_GENERATE_FAILED_ERROR,
  POST_GENERATE_MOCK_ERROR,
} from "../src/services/ai/post-generator/apiHelpers.ts";
import { postGeneratorService } from "../src/services/ai/post-generator/generatorService.ts";
import type {
  CarSpecsInput,
  GeneratorOptions,
  FollowUpQuestion,
  GeneratedPosts,
} from "../src/types/ai/post-generator.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const specs: CarSpecsInput = {
  brand: "Toyota",
  model: "Yaris",
  year: "2020",
  price: 399000,
  mileage: 32000,
  condition: "ดี",
  fuelType: "petrol",
  color: "ขาว",
};
const options: GeneratorOptions = {
  tone: "youth",
  includeHashtags: true,
  emojiOptimization: true,
  seoOptimization: false,
  autoTranslate: false,
  customLanguage: "th",
};
const questions: FollowUpQuestion[] = [];

const realPosts: GeneratedPosts = {
  facebook: "โพสต์จริงจาก AI",
  tiktok: "ติ๊กต๊อกจริง",
  seoDescription: "SEO จริง",
  marketplaceTitle: "หัวข้อจริง",
  shortCaption: "แคปชั่นจริง",
  viralHook: "ฮุคจริง",
  closingCta: "CTA จริง",
  tags: ["รถมือสอง"],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Mirrors hook: deduct + show results only after generatePosts resolves. */
async function simulateGenerateFinalFlow(generateFn: () => Promise<GeneratedPosts>) {
  let quotaDeducted = 0;
  let generatedResults: GeneratedPosts | null = null;
  let workflowError: string | null = null;
  let currentStep: "questions" | "generating" | "results" = "generating";

  try {
    const results = await generateFn();
    quotaDeducted += 1;
    generatedResults = results;
    currentStep = "results";
  } catch (err) {
    workflowError =
      err instanceof Error && err.message.trim()
        ? err.message
        : POST_GENERATE_FAILED_ERROR;
    generatedResults = null;
    currentStep = "questions";
  }

  return { quotaDeducted, generatedResults, workflowError, currentStep };
}

console.log("--- Car Post Generator honesty gate ---");

// --- Pure honesty evaluator ---
{
  const real = evaluatePostGenerateHonesty({
    success: true,
    isMock: false,
    posts: realPosts,
  });
  ok("A-eval-real-ok", real.ok === true);
  ok("A-eval-real-quota", shouldDeductPostGenerationQuota(real) === true);

  const mock = evaluatePostGenerateHonesty({
    success: true,
    isMock: true,
    posts: realPosts,
  });
  ok("B-eval-mock-reject", mock.ok === false && mock.reason === "mock");
  ok("B-eval-mock-no-quota", shouldDeductPostGenerationQuota(mock) === false);

  const invalid = evaluatePostGenerateHonesty({
    success: false,
    isMock: false,
  });
  ok("C-eval-invalid-reject", invalid.ok === false && invalid.reason === "invalid");
  ok(
    "C-eval-invalid-no-quota",
    shouldDeductPostGenerationQuota(invalid) === false
  );
}

const previousFetch = globalThis.fetch;

try {
  // A. Real success
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!url.includes("/api/ai/post-generator/generate")) {
      throw new Error(`Unexpected fetch: ${url}`);
    }
    return jsonResponse({
      success: true,
      isMock: false,
      posts: realPosts,
    });
  }) as typeof fetch;

  const aPosts = await postGeneratorService.generatePosts(
    specs,
    options,
    questions
  );
  ok("A-service-returns-posts", aPosts.facebook.includes("โพสต์จริงจาก AI"));

  const aFlow = await simulateGenerateFinalFlow(() =>
    postGeneratorService.generatePosts(specs, options, questions)
  );
  ok("A-flow-results-step", aFlow.currentStep === "results");
  ok("A-flow-shows-posts", aFlow.generatedResults?.facebook.includes("โพสต์จริง") === true);
  ok("A-flow-deducts-quota", aFlow.quotaDeducted === 1);
  ok("A-flow-no-error", aFlow.workflowError === null);

  // B. isMock=true
  globalThis.fetch = (async () =>
    jsonResponse({
      success: true,
      isMock: true,
      posts: realPosts,
    })) as typeof fetch;

  let bThrew: Error | null = null;
  try {
    await postGeneratorService.generatePosts(specs, options, questions);
  } catch (e) {
    bThrew = e instanceof Error ? e : new Error(String(e));
  }
  ok("B-service-throws", bThrew !== null);
  ok(
    "B-service-mock-message",
    bThrew?.message === POST_GENERATE_MOCK_ERROR,
    bThrew?.message ?? ""
  );

  const bFlow = await simulateGenerateFinalFlow(() =>
    postGeneratorService.generatePosts(specs, options, questions)
  );
  ok("B-flow-error-step", bFlow.currentStep === "questions");
  ok("B-flow-no-success-posts", bFlow.generatedResults === null);
  ok("B-flow-no-quota", bFlow.quotaDeducted === 0);
  ok(
    "B-flow-user-error",
    bFlow.workflowError === POST_GENERATE_MOCK_ERROR,
    bFlow.workflowError ?? ""
  );

  // C. request/generate failure
  globalThis.fetch = (async () =>
    jsonResponse({ error: "boom" }, 500)) as typeof fetch;

  let cThrew: Error | null = null;
  try {
    await postGeneratorService.generatePosts(specs, options, questions);
  } catch (e) {
    cThrew = e instanceof Error ? e : new Error(String(e));
  }
  ok("C-service-throws", cThrew !== null);
  ok(
    "C-service-fail-message",
    cThrew?.message === POST_GENERATE_FAILED_ERROR,
    cThrew?.message ?? ""
  );

  const cFlow = await simulateGenerateFinalFlow(() =>
    postGeneratorService.generatePosts(specs, options, questions)
  );
  ok("C-flow-error-step", cFlow.currentStep === "questions");
  ok("C-flow-no-success-posts", cFlow.generatedResults === null);
  ok("C-flow-no-quota", cFlow.quotaDeducted === 0);
  ok(
    "C-flow-user-error",
    Boolean(cFlow.workflowError && cFlow.workflowError.length > 0)
  );
} finally {
  globalThis.fetch = previousFetch;
}

// --- Hook source honesty contracts ---
{
  const hookPath = path.join(
    root,
    "src/hooks/ai/post/useCarPostGenerator.ts"
  );
  const hookSrc = fs.readFileSync(hookPath, "utf8");

  ok(
    "hook-no-catch-fallback-success",
    !hookSrc.includes("ระบบใช้ข้อความสำรองให้แล้ว") &&
      !/catch\s*\{[\s\S]*setGeneratedResults\(fallback\)/.test(hookSrc)
  );
  ok(
    "hook-triggerUsage-after-runGenerate",
    /const results = await runGenerate\(null\);[\s\S]*await triggerUsage\("post-generation"\)/.test(
      hookSrc
    )
  );
  ok(
    "hook-catch-clears-results",
    /catch\s*\(err\)\s*\{[\s\S]*setGeneratedResults\(null\)[\s\S]*setCurrentStep\("questions"\)/.test(
      hookSrc
    )
  );

  const servicePath = path.join(
    root,
    "src/services/ai/post-generator/generatorService.ts"
  );
  const serviceSrc = fs.readFileSync(servicePath, "utf8");
  ok(
    "service-checks-isMock",
    serviceSrc.includes("evaluatePostGenerateHonesty") &&
      serviceSrc.includes("isMock")
  );
  ok(
    "service-no-silent-fallback-catch",
    !/catch\s*\{\s*return fallback;\s*\}/.test(serviceSrc)
  );
}

if (process.exitCode && process.exitCode !== 0) {
  console.log("\nHonesty gate tests FAILED");
} else {
  console.log("\nHonesty gate tests PASSED");
}
