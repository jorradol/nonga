/** v5.4.4f — Firebase rules emulator test environment helpers. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { RULES_PROJECT_ID } from "./v544f-personas.mts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export interface RulesEnvOptions {
  firestore?: boolean;
  storage?: boolean;
}

export async function createRulesTestEnvironment(
  options: RulesEnvOptions = { firestore: true, storage: false }
): Promise<RulesTestEnvironment> {
  const config: Parameters<typeof initializeTestEnvironment>[0] = {
    projectId: RULES_PROJECT_ID,
  };

  if (options.firestore) {
    config.firestore = {
      rules: readFileSync(resolve(repoRoot, "firestore.rules"), "utf8"),
    };
  }

  if (options.storage) {
    config.storage = {
      rules: readFileSync(resolve(repoRoot, "storage.rules"), "utf8"),
    };
    if (!config.firestore) {
      config.firestore = {
        rules: readFileSync(resolve(repoRoot, "firestore.rules"), "utf8"),
      };
    }
  }

  return initializeTestEnvironment(config);
}

export { assertFails, assertSucceeds, type RulesTestEnvironment };

export function assertPass(cond: boolean, label: string, detail = ""): void {
  if (!cond) {
    console.error(`FAIL: ${label}`, detail);
    process.exit(1);
  }
  console.log(`PASS: ${label}`);
}

export async function runRuleCase(
  label: string,
  pr: Promise<unknown> | PromiseLike<unknown>,
  expect: "allow" | "deny"
): Promise<void> {
  const promise = Promise.resolve(pr);
  try {
    if (expect === "allow") {
      await assertSucceeds(promise);
      assertPass(true, label);
    } else {
      await assertFails(promise);
      assertPass(true, label);
    }
  } catch (err) {
    console.error(`FAIL: ${label}`, err);
    process.exit(1);
  }
}
