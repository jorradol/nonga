/**
 * v5.4.4j — Vehicle image content validation (safe mode default)
 * npm run test:v544j-vehicle-image-validation
 */
import {
  VEHICLE_IMAGE_FAIL_MESSAGE,
  VEHICLE_IMAGE_PUBLISH_BLOCK_MESSAGE,
  VEHICLE_IMAGE_WARN_MESSAGE,
  VEHICLE_WARN_PUBLISH_MIN_CONFIDENCE,
  classifyVehicleVisionProbe,
  countsAsPublishVehicleImage,
  hasActionableVehicleImageAnalysis,
  resolveVehicleImageValidationMode,
  validateDraftVehicleImagesForPublish,
} from "../src/utils/vehicleImageValidationShared.ts";
import {
  resetVehicleImageValidationCacheForTests,
  validateVehicleImageContent,
} from "../src/server/vehicleImageValidation.ts";
import {
  resetVehicleVisionAnalyzerForTests,
  setVehicleVisionAnalyzerForTests,
  type VehicleVisionProbe,
} from "../src/server/vehicleVisionAnalyzer.ts";
import { validateDraftForPublish } from "../src/utils/dealerPublishGuard.ts";
import { processListingImageUpload } from "../src/server/listingImageProcessor.ts";

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const ENV_KEY = "NONGA_VEHICLE_IMAGE_VALIDATION";

function tinyPng(): Buffer {
  return Buffer.from(TINY_PNG_B64, "base64");
}

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail = ""): never {
  console.error(`FAIL: ${label}`, detail);
  process.exit(1);
}

function mockAnalyzer(probe: VehicleVisionProbe) {
  return async () => probe;
}

async function withEnv(
  value: string | undefined,
  fn: () => Promise<void>
): Promise<void> {
  const prev = process.env[ENV_KEY];
  if (value === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = value;
  try {
    await fn();
  } finally {
    if (prev === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prev;
  }
}

async function main(): Promise<void> {
  console.log("=== Nong A v5.4.4j Vehicle Image Content Validation ===\n");

  resetVehicleImageValidationCacheForTests();
  resetVehicleVisionAnalyzerForTests();

  if (resolveVehicleImageValidationMode({}) !== "off") {
    fail("default-mode-is-off", resolveVehicleImageValidationMode({}));
  }
  pass("default-mode-is-off");

  const passResult = classifyVehicleVisionProbe({
    hasVehicle: true,
    vehicleConfidence: 0.9,
    imageClarity: 0.85,
  });
  if (passResult.vehicleImageStatus !== "pass") {
    fail("classify-clear-vehicle", passResult.vehicleImageStatus);
  }
  pass("classify-clear-vehicle");

  const failResult = classifyVehicleVisionProbe({
    hasVehicle: false,
    vehicleConfidence: 0.1,
    imageClarity: 0.8,
  });
  if (failResult.vehicleImageStatus !== "fail" || failResult.vehicleImageReason !== VEHICLE_IMAGE_FAIL_MESSAGE) {
    fail("classify-not-vehicle", failResult.vehicleImageReason);
  }
  pass("classify-not-vehicle");

  const warnResult = classifyVehicleVisionProbe({
    hasVehicle: true,
    vehicleConfidence: 0.5,
    imageClarity: 0.4,
  });
  if (warnResult.vehicleImageStatus !== "warn" && warnResult.vehicleImageStatus !== "unknown") {
    fail("classify-unclear-vehicle", warnResult.vehicleImageStatus);
  }
  pass("classify-unclear-vehicle");

  await withEnv(undefined, async () => {
    let analyzeCalls = 0;
    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(async () => {
      analyzeCalls += 1;
      return {
        hasVehicle: true,
        vehicleConfidence: 0.9,
        imageClarity: 0.85,
      };
    });
    const result = await validateVehicleImageContent(tinyPng(), {
      mimeType: "image/png",
    });
    if (analyzeCalls !== 0) {
      fail("default-does-not-call-gemini", String(analyzeCalls));
    }
    if (result.vehicleImageStatus !== "unknown") {
      fail("default-returns-unknown", result.vehicleImageStatus);
    }
    pass("default-does-not-call-gemini");
    pass("default-returns-unknown");
  });

  await withEnv("off", async () => {
    let analyzeCalls = 0;
    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(async () => {
      analyzeCalls += 1;
      return {
        hasVehicle: true,
        vehicleConfidence: 0.9,
        imageClarity: 0.85,
      };
    });
    const result = await validateVehicleImageContent(tinyPng(), {
      mimeType: "image/png",
    });
    if (analyzeCalls !== 0) fail("off-does-not-call-gemini", String(analyzeCalls));
    if (result.vehicleImageStatus !== "unknown") {
      fail("off-returns-unknown", result.vehicleImageStatus);
    }
    pass("off-does-not-call-gemini");
    pass("off-returns-unknown");
  });

  await withEnv("metadata-only", async () => {
    let analyzeCalls = 0;
    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(async () => {
      analyzeCalls += 1;
      return {
        hasVehicle: true,
        vehicleConfidence: 0.9,
        imageClarity: 0.85,
      };
    });
    const result = await validateVehicleImageContent(tinyPng(), {
      mimeType: "image/png",
    });
    if (analyzeCalls !== 0) {
      fail("metadata-only-does-not-call-gemini", String(analyzeCalls));
    }
    if (result.vehicleImageStatus !== "unknown" || result.source !== "foundation") {
      fail("metadata-only-foundation-fallback", `${result.vehicleImageStatus}/${result.source}`);
    }
    pass("metadata-only-does-not-call-gemini");
    pass("metadata-only-foundation-fallback");

    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(async () => {
      throw new Error("should not run");
    });
    const foundationAlias = await validateVehicleImageContent(tinyPng(), {
      mimeType: "image/png",
      mode: "foundation",
    });
    if (foundationAlias.vehicleImageStatus !== "unknown" || foundationAlias.source !== "foundation") {
      fail("foundation-alias-fallback", `${foundationAlias.vehicleImageStatus}/${foundationAlias.source}`);
    }
    pass("foundation-alias-fallback");
  });

  await withEnv("vision", async () => {
    setVehicleVisionAnalyzerForTests(
      mockAnalyzer({
        hasVehicle: true,
        vehicleConfidence: 0.9,
        imageClarity: 0.85,
      })
    );
    resetVehicleImageValidationCacheForTests();
    const analyzedPass = await validateVehicleImageContent(tinyPng(), {
      mimeType: "image/png",
    });
    if (analyzedPass.vehicleImageStatus !== "pass" || analyzedPass.source !== "vision") {
      fail("vision-mode-pass", `${analyzedPass.vehicleImageStatus}/${analyzedPass.source}`);
    }
    pass("vision-mode-pass");

    let analyzeCalls = 0;
    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(async () => {
      analyzeCalls += 1;
      return {
        hasVehicle: true,
        vehicleConfidence: 0.9,
        imageClarity: 0.85,
      };
    });
    await validateVehicleImageContent(tinyPng(), { mimeType: "image/png" });
    await validateVehicleImageContent(tinyPng(), { mimeType: "image/png" });
    if (analyzeCalls !== 1) {
      fail("vision-cache-prevents-repeat", String(analyzeCalls));
    }
    pass("vision-cache-prevents-repeat");

    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(
      mockAnalyzer({
        hasVehicle: false,
        vehicleConfidence: 0.05,
        imageClarity: 0.8,
      })
    );
    const analyzedFail = await validateVehicleImageContent(tinyPng(), {
      mimeType: "image/png",
    });
    if (analyzedFail.vehicleImageStatus !== "fail") {
      fail("vision-mode-fail", analyzedFail.vehicleImageStatus);
    }
    pass("vision-mode-fail");

    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(async () => {
      throw new Error("network down");
    });
    const fallback = await validateVehicleImageContent(tinyPng(), {
      mimeType: "image/png",
    });
    if (fallback.vehicleImageStatus !== "unknown") {
      fail("vision-unavailable-fallback", fallback.vehicleImageStatus);
    }
    pass("vision-unavailable-fallback");

    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(
      mockAnalyzer({
        hasVehicle: true,
        vehicleConfidence: 0.9,
        imageClarity: 0.85,
      })
    );
    const processed = await processListingImageUpload(
      tinyPng(),
      "image/png",
      "vehicle.png"
    );
    if (
      processed.ok === false ||
      processed.data.vehicleValidation?.vehicleImageStatus !== "pass"
    ) {
      fail("processor-vision-mode-pass");
    }
    pass("processor-vision-mode-pass");
  });

  await withEnv(undefined, async () => {
    resetVehicleImageValidationCacheForTests();
    setVehicleVisionAnalyzerForTests(
      mockAnalyzer({
        hasVehicle: true,
        vehicleConfidence: 0.9,
        imageClarity: 0.85,
      })
    );
    const processed = await processListingImageUpload(
      tinyPng(),
      "image/png",
      "vehicle.png"
    );
    if (
      processed.ok === false ||
      processed.data.vehicleValidation?.vehicleImageStatus !== "unknown"
    ) {
      fail("processor-default-unknown");
    }
    pass("processor-default-unknown");
  });

  const legacyUnknownPublish = validateDraftForPublish({
    id: "draft-legacy",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    mileage: 45000,
    images: ["/storage/listings/draft-legacy/01-a.webp"],
    imageMetadata: [
      {
        imageUrl: "/storage/listings/draft-legacy/01-a.webp",
        vehicleImageStatus: "unknown",
      },
    ],
  });
  if (!legacyUnknownPublish.ok) {
    fail("unknown-only-legacy-publish", legacyUnknownPublish.missingFields.join(","));
  }
  if (hasActionableVehicleImageAnalysis(legacyUnknownPublish.imageMetadata)) {
    fail("unknown-only-not-actionable");
  }
  pass("unknown-only-legacy-publish");

  const publishableDraft = validateDraftForPublish({
    id: "draft-1",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    mileage: 45000,
    images: ["/storage/listings/draft-1/01-a.webp"],
    imageMetadata: [
      {
        imageUrl: "/storage/listings/draft-1/01-a.webp",
        hasVehicle: true,
        vehicleConfidence: 0.9,
        vehicleImageStatus: "pass",
      },
    ],
  });
  if (!publishableDraft.ok) {
    fail("publish-with-vehicle-pass", publishableDraft.missingFields.join(","));
  }
  pass("publish-with-vehicle-pass");

  const blockedDraft = validateDraftForPublish({
    id: "draft-2",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    mileage: 45000,
    images: ["/storage/listings/draft-2/01-a.webp"],
    imageMetadata: [
      {
        imageUrl: "/storage/listings/draft-2/01-a.webp",
        hasVehicle: false,
        vehicleConfidence: 0.1,
        vehicleImageStatus: "fail",
        vehicleImageReason: VEHICLE_IMAGE_FAIL_MESSAGE,
      },
    ],
  });
  if (
    blockedDraft.ok ||
    !blockedDraft.missingFields.includes("vehicle_image")
  ) {
    fail("publish-block-non-vehicle", blockedDraft.missingFields.join(","));
  }
  pass("publish-block-non-vehicle");

  const warnPublishable = validateDraftForPublish({
    id: "draft-3",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    mileage: 45000,
    images: ["/storage/listings/draft-3/01-a.webp"],
    imageMetadata: [
      {
        imageUrl: "/storage/listings/draft-3/01-a.webp",
        hasVehicle: true,
        vehicleConfidence: VEHICLE_WARN_PUBLISH_MIN_CONFIDENCE,
        vehicleImageStatus: "warn",
        vehicleImageReason: VEHICLE_IMAGE_WARN_MESSAGE,
      },
    ],
  });
  if (!warnPublishable.ok) {
    fail("publish-warn-high-confidence", warnPublishable.missingFields.join(","));
  }
  pass("publish-warn-high-confidence");

  if (!countsAsPublishVehicleImage({ vehicleImageStatus: "pass", vehicleConfidence: 0.9 })) {
    fail("counts-as-publish-pass");
  }
  if (countsAsPublishVehicleImage({ vehicleImageStatus: "fail", vehicleConfidence: 0.9 })) {
    fail("counts-as-publish-fail");
  }
  pass("counts-as-publish-rules");

  const vehicleGuard = validateDraftVehicleImagesForPublish({
    id: "draft-5",
    images: ["/storage/listings/draft-5/01-a.webp"],
    imageMetadata: [
      {
        imageUrl: "/storage/listings/draft-5/01-a.webp",
        vehicleImageStatus: "fail",
      },
    ],
  });
  if (vehicleGuard.ok === false && vehicleGuard.message === VEHICLE_IMAGE_PUBLISH_BLOCK_MESSAGE) {
    pass("vehicle-guard-message");
  } else {
    fail(
      "vehicle-guard-message",
      vehicleGuard.ok === true ? "expected block" : vehicleGuard.message ?? ""
    );
  }

  console.log("\n=== v5.4.4j vehicle image validation — OK ===");
}

main().catch((err) => {
  console.error("FAIL: unhandled", err instanceof Error ? err.message : err);
  process.exit(1);
});
