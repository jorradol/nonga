/**
 * Dealer paste — save draft success → drafts list + redirect policy
 * npm run test:dealer-paste-save-redirect
 */
import {
  DEALER_DRAFTS_PATH,
  shouldRedirectAfterPasteDraftSave,
} from "../src/utils/dealer/dealerPasteSaveRedirect.ts";
import { editablePasteDraftToPayload } from "../src/utils/inventoryImport/editablePasteDraft.ts";
import { createEditablePasteDraft } from "../src/utils/inventoryImport/editablePasteDraft.ts";
import { parseThorAutoPasteRow } from "../src/utils/inventoryImport/pasteRawVehicleParser.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

const OWNER = {
  dealerId: THOR_AUTO_DEALER_ID,
  ownerId: "owner-thor-auto",
  ownerName: "Thor Auto Test",
  ownerPhone: "0815553335",
  showroomName: "Thor Auto",
};

const SAMPLE_ROW = [
  "Honda",
  "CRV",
  "8กผ2813",
  "2.4ES",
  "feat",
  "AT",
  "2019",
  "ดำ",
  "161392",
  "699",
  "840000",
  "AAA",
  "18/06/2024",
  "ปกติ",
  "1",
  "TRUE",
  "TRUE",
  "11,703 / 84",
].join("\t");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

async function main() {
  console.log("=== Dealer Paste Save Redirect ===\n");

  ok("1-drafts-path", DEALER_DRAFTS_PATH === "/dealer/drafts", DEALER_DRAFTS_PATH);
  ok("2-redirect-on-success", shouldRedirectAfterPasteDraftSave(true), "");
  ok("3-no-redirect-on-fail", !shouldRedirectAfterPasteDraftSave(false), "");

  const BASE = process.env.APP_URL ?? "http://localhost:3000";
  const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "X-Dealer-Id": THOR_AUTO_DEALER_ID,
    "X-User-Role": "dealer",
    "Content-Type": "application/json",
  };

  try {
    const ping = await fetch(BASE);
    ok("4-server", ping.ok, String(ping.status));
  } catch (e) {
    ok("4-server", false, String(e));
    console.log("\nSkip API tests — server not running");
    process.exit(process.exitCode === 1 ? 1 : 0);
  }

  const parsed = parseThorAutoPasteRow(SAMPLE_ROW);
  const { payload } = editablePasteDraftToPayload(
    createEditablePasteDraft(parsed),
    OWNER,
    parsed,
    { commitDraftId: `draft-import-${Date.now()}-d0` }
  );
  if (!payload) {
    ok("5-payload", false, "no payload");
    process.exit(1);
  }

  const commitRes = await fetch(`${BASE}/api/dealer/import/commit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ published: [], drafts: [payload], owner: OWNER }),
  });
  const commitBody = await commitRes.json();
  ok(
    "5-commit-success",
    commitRes.ok && commitBody.success === true,
    JSON.stringify(commitBody).slice(0, 100)
  );

  const draftId =
    commitBody.drafts?.[0]?.id ??
    commitBody.imported?.find(
      (m: { bucket?: string; id: string }) => m.bucket === "draft"
    )?.id;

  ok("6-draft-id-in-response", !!draftId, draftId ?? "");

  const listRes = await fetch(`${BASE}/api/dealer/drafts`, { headers });
  const listBody = await listRes.json();
  const ids = (listBody.data ?? []).map((d: { id: string }) => d.id);
  ok(
    "7-draft-in-list",
    draftId ? ids.includes(draftId) : false,
    `count=${ids.length}`
  );

  const badRes = await fetch(`${BASE}/api/dealer/import/commit`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      published: [],
      drafts: [{ sourceRowIndex: 1, disposition: "draft" }],
      owner: OWNER,
    }),
  });
  ok(
    "8-fail-no-redirect-policy",
    !shouldRedirectAfterPasteDraftSave(badRes.ok),
    String(badRes.status)
  );

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
