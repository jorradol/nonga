/**
 * npm run test:friendly-errors
 */
import assert from "node:assert/strict";
import {
  AppFriendlyError,
  notJsonResponseError,
  mapHttpStatusToFriendly,
  toFriendlyError,
} from "../src/utils/appFriendlyError.ts";

assert.ok(
  toFriendlyError(new SyntaxError("Unexpected token '<', \"<!doctype\"..."))
    .friendlyMessage.includes("น้องเอโหลดข้อมูลประกาศไม่สำเร็จ"),
  "JSON parse → friendly Thai"
);

const htmlErr = notJsonResponseError("/api/my/listings", 200, "text/html", "<!doctype html>");
assert.ok(htmlErr.technicalDetail.includes("ไม่ใช่ JSON"));
assert.ok(!htmlErr.friendlyMessage.includes("Unexpected token"));

assert.equal(mapHttpStatusToFriendly(401, "/x").code, "unauthorized");
assert.equal(mapHttpStatusToFriendly(403, "/x").code, "forbidden");
assert.equal(mapHttpStatusToFriendly(404, "/x").code, "not_found");
assert.equal(mapHttpStatusToFriendly(500, "/x").code, "server");
assert.ok(
  mapHttpStatusToFriendly(413, "/api/cars/x/images").friendlyMessage.includes(
    "ใหญ่เกินไป"
  )
);

assert.ok(toFriendlyError(new AppFriendlyError({
  code: "not_json",
  friendlyTitle: "t",
  friendlyMessage: "m",
  technicalDetail: "tech",
})).technicalDetail === "tech");

console.log("test:friendly-errors — OK");
