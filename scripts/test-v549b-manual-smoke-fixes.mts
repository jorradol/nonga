/**
 * v5.4.9B — manual smoke bugfixes (chat detail, edit message, admin/dealer routes)
 * npm run test:v549b-manual-smoke-fixes
 */
import fs from "node:fs";
import path from "node:path";
import {
  resolvePathnameForView,
  resolveViewFromPathname,
} from "../src/utils/appRouteSync.ts";
import { resolveDealerInventoryScopeId } from "../src/utils/dealerIdentity.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const carCard = fs.readFileSync(
  path.resolve("src/components/chat/ChatCarCard.tsx"),
  "utf8"
);
const editable = fs.readFileSync(
  path.resolve("src/hooks/chat/useEditableMessage.ts"),
  "utf8"
);
const bubble = fs.readFileSync(
  path.resolve("src/components/chat/ChatMessageBubble.tsx"),
  "utf8"
);
const dealerPortal = fs.readFileSync(
  path.resolve("src/hooks/dealer/useDealerPortal.ts"),
  "utf8"
);
const adminNotice = fs.readFileSync(
  path.resolve("src/components/dealer-portal/DealerPortalAdminScopeNotice.tsx"),
  "utf8"
);

console.log("--- Bug A: chat car detail stays in chat ---");
ok(
  "chat-card-primary-expand-label",
  carCard.includes("ดูรายละเอียดรถ") && carCard.includes("handleToggleInChatDetail"),
  ""
);
ok(
  "chat-card-no-setview",
  !carCard.includes("setView") && !carCard.includes("useAppStore"),
  ""
);
ok(
  "chat-card-no-full-page-escape",
  !carCard.includes("window.open") && !carCard.includes("chat-car-card-full-detail-btn"),
  ""
);

console.log("\n--- Bug B: edit message closes on save ---");
ok(
  "editable-clears-on-success",
  editable.includes("setIsEditing(false)") && editable.includes("try {"),
  ""
);
ok(
  "editable-sync-initial-when-not-editing",
  editable.includes("if (!isEditing)") && editable.includes("setEditValue(initialText)"),
  ""
);
ok(
  "bubble-save-awaits-edit",
  bubble.includes("await editMessage") && bubble.includes("void saveEditing()"),
  ""
);

console.log("\n--- Bug C: admin dashboard route + dealer scope ---");
ok(
  "admin-dashboard-path-resolve",
  resolveViewFromPathname("/admin/dashboard") === "admin-dashboard",
  ""
);
ok(
  "admin-dashboard-setview-path",
  resolvePathnameForView("admin-dashboard", "/") === "/admin/dashboard",
  ""
);
ok(
  "dealer-scope-admin-without-dealerid-null",
  resolveDealerInventoryScopeId(
    { uid: "admin1-uid", role: "admin" },
    "admin"
  ) === null,
  ""
);
ok(
  "dealer-scope-dealer-with-profile",
  resolveDealerInventoryScopeId(
    { uid: "dealer-x", role: "dealer", dealerId: "thor-auto" },
    "dealer"
  ) === "thor-auto",
  ""
);
ok(
  "use-dealer-portal-scoped-api-headers",
  dealerPortal.includes("resolveDealerInventoryScopeId") &&
    dealerPortal.includes("DealerApiHeaders | null"),
  ""
);
ok(
  "admin-no-scope-notice-testid",
  adminNotice.includes("dealer-portal-admin-no-scope"),
  ""
);

console.log("\nDone v5.4.9B manual smoke fixes tests.");
