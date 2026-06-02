/**
 * v5.4.7g — /cars/:id deep-link routing
 */
import { strict as assert } from "node:assert";
import {
  isChatEntryPath,
  resolveCarIdFromPathname,
  resolveViewFromPathname,
} from "../src/utils/appRouteSync.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.4.7g car detail routing ===\n");

ok("root-still-chat", resolveViewFromPathname("/") === "chat", "");
ok("chat-still-chat", resolveViewFromPathname("/chat") === "chat", "");
ok("home-unchanged", resolveViewFromPathname("/home") === "home", "");
ok("marketplace-unchanged", resolveViewFromPathname("/marketplace") === "marketplace", "");
ok("admin-reports-unchanged", resolveViewFromPathname("/admin/reports") === "admin-reports", "");

const carId = "car-1780383933571";
ok(
  "cars-id-maps-to-detail",
  resolveViewFromPathname(`/cars/${carId}`) === "car-details",
  `/cars/${carId}`
);
ok(
  "resolve-car-id",
  resolveCarIdFromPathname(`/cars/${carId}`) === carId,
  carId
);
ok(
  "encoded-car-id",
  resolveCarIdFromPathname("/cars/car%2Ftest") === "car/test",
  ""
);
ok(
  "unknown-path-still-chat",
  resolveViewFromPathname("/unknown-path") === "chat",
  ""
);
ok("cars-not-chat-entry", !isChatEntryPath(`/cars/${carId}`), "");

console.log("\n=== v5.4.7g car detail routing — done ===\n");
assert(process.exitCode !== 1, "some checks failed");
