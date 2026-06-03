/**
 * v5.4.10C — dealer chat draft image preview after save
 * npm run test:v5410c-dealer-chat-draft-image-preview
 */
import fs from "node:fs";
import path from "node:path";
import {
  attachmentsForSavedDealerDraft,
  buildDealerChatImageUploadNote,
} from "../src/services/chat/dealerChatDraftImageSave.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("--- Upload note accuracy ---");
ok(
  "full-success-note",
  buildDealerChatImageUploadNote(5, { storedUrls: ["a", "b", "c", "d", "e"] }).includes(
    "แนบรูปภาพแล้ว 5 รูป"
  ),
  ""
);
ok(
  "partial-success-note",
  buildDealerChatImageUploadNote(5, {
    storedUrls: ["a", "b", "c"],
    failed: [{ name: "x.jpg", error: "fail" }],
  }).includes("3/5"),
  ""
);
ok(
  "total-failure-note",
  !buildDealerChatImageUploadNote(5, {
    storedUrls: [],
    failed: [{ name: "x.jpg", error: "fail" }],
  }).includes("แนบรูปภาพแล้ว 5 รูป"),
  ""
);

console.log("\n--- Saved draft attachments use uploaded URLs ---");
const uploaded = attachmentsForSavedDealerDraft(
  ["https://storage.example/draft/1.jpg", "https://storage.example/draft/2.jpg"],
  [{ id: "blob-1", kind: "image", name: "local", size: 0, mimeType: "image/jpeg" }]
);
ok(
  "prefers-uploaded-urls",
  uploaded?.length === 2 &&
    uploaded.every((item) => item.imageUrl?.includes("storage.example")),
  ""
);
ok(
  "fallback-when-no-uploaded",
  attachmentsForSavedDealerDraft(undefined, [
    { id: "blob-1", kind: "image", name: "local", size: 0, mimeType: "image/jpeg" },
  ])?.[0]?.id === "blob-1",
  ""
);

const useChat = fs.readFileSync(path.resolve("src/hooks/chat/useChat.ts"), "utf8");
console.log("\n--- useChat save path wiring ---");
ok(
  "save-dealer-draft-returns-uploaded-urls",
  useChat.includes("uploadedImageUrls") &&
    useChat.includes("return { text: saveText, savedDraftId: newDraftId, uploadedImageUrls"),
  ""
);
ok(
  "finalize-uses-attachments-for-saved-dealer-draft",
  (useChat.match(/attachmentsForSavedDealerDraft/g) ?? []).length >= 3,
  ""
);
ok(
  "clear-images-after-upload-before-finalize-attachments",
  /uploadResult = await uploadChatImagesToDraft[\s\S]*uploadedImageUrls = uploadResult\.storedUrls[\s\S]*clearChatImagesForDraft/.test(
    useChat
  ),
  ""
);

const dealerRoutes = fs.readFileSync(
  path.resolve("src/server/dealerPortalRoutes.ts"),
  "utf8"
);
console.log("\n--- Draft record image fields (server unchanged) ---");
ok(
  "upload-images-patches-images-field",
  dealerRoutes.includes("images: merged") &&
    dealerRoutes.includes("sourceImageUrls: merged"),
  ""
);

console.log("\nDone v5.4.10C dealer chat draft image preview tests.");
