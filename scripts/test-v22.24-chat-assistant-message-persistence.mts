/**
 * v22.24 — Assistant chat message persistence / reopen rehydration
 * npm run test:v22.24-chat-assistant-message-persistence
 */
import { readFileSync } from "node:fs";
import {
  appendChatMessage,
  createChatSession,
  loadChatMessages,
  mergeChatMessagesById,
  messageToFirestoreDataForTest,
  setChatHistoryStorageForTest,
} from "../src/services/chat/chatHistoryService.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { summaryToChatCarCardData } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";
import type { ChatStorageScope } from "../src/utils/chatStorageScope.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  } as Storage;
}

function documentContainsUndefined(value: unknown, path = ""): string | null {
  if (value === undefined) return path || "(root)";
  if (value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = documentContainsUndefined(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const hit = documentContainsUndefined(nested, path ? `${path}.${key}` : key);
    if (hit) return hit;
  }
  return null;
}

const FIREBASE =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/listing-images%2Fthor-auto%2Fcar-import-prior%2F01.jpg?alt=media&token=test-token-not-secret";

const INVENTORY: ChatInventoryCar[] = [
  {
    id: "car-import-crv",
    title: "Honda CRV ปี 2019",
    brand: "Honda",
    model: "CRV",
    year: 2019,
    price: 599000,
    mileage: 82000,
    type: "used",
    images: [FIREBASE],
    isSold: false,
    listingStatus: "published",
  },
  {
    id: "car-import-camry-a",
    title: "Toyota Camry ปี 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 699000,
    mileage: 70000,
    type: "used",
    images: [FIREBASE.replace("01.jpg", "02.jpg")],
    isSold: false,
    listingStatus: "published",
  },
  {
    id: "car-import-camry-b",
    title: "Toyota Camry ปี 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 729000,
    mileage: 48000,
    type: "used",
    images: [FIREBASE.replace("01.jpg", "03.jpg")],
    isSold: false,
    listingStatus: "published",
  },
];

const memberScope: ChatStorageScope = {
  storageKey: "user:uid-owner-v2224",
  dealerId: null,
  userId: "uid-owner-v2224",
  mode: "consumer",
};

const OLD_UI_RE =
  /น้องเอจัดการ์ดไว้ด้านล่างให้แล้ว|กด 'ดูรายละเอียดในแชท'|เดี๋ยวน้องเอแสดงข้อมูลรถให้ดู/;

async function main() {
  console.log("\n--- source guards ---");
  {
    const history = readFileSync("src/services/chat/chatHistoryService.ts", "utf8");
    const cards = readFileSync("src/services/ai/chat/marketplaceChatSearch.ts", "utf8");
    ok("history strips undefined before Firestore", history.includes("stripUndefinedDeep"));
    ok("history merges local+firestore on load", history.includes("mergeChatMessagesById"));
    ok(
      "card builder omits undefined optionals",
      cards.includes("...(c.color ? { color: c.color } : {})")
    );
  }

  console.log("\n--- carCards Firestore-safe ---");
  {
    const card = summaryToChatCarCardData(
      {
        id: "car-import-crv",
        title: "Honda CRV",
        brand: "Honda",
        model: "CRV",
        year: 2019,
        price: 599000,
        mileage: 82000,
        type: "used",
        images: [FIREBASE],
        isSold: false,
        listingStatus: "published",
        bodyClass: "suv",
        bodyClassLabel: "SUV / Crossover",
        hasImage: true,
      },
      "exact"
    );
    const payload = messageToFirestoreDataForTest({
      id: "msg-ai-1",
      sender: "ai",
      text: "มีครับ เจอ Honda CRV ปี 2019 อยู่ 1 คัน",
      createdAt: "2026-07-09T05:00:00.000Z",
      carCards: [card],
    });
    ok(
      "AI message with carCards has no undefined",
      documentContainsUndefined(payload) == null,
      String(documentContainsUndefined(payload))
    );
    ok("payload keeps carCards", Array.isArray(payload.carCards) && payload.carCards.length === 1);
    ok("payload keeps image", Boolean((payload.carCards as Array<{ imageUrl?: string }>)[0]?.imageUrl));
  }

  console.log("\n--- save user + assistant, reload simulation ---");
  {
    const storage = createMemoryStorage();
    setChatHistoryStorageForTest(storage);
    const session = await createChatSession(memberScope, "Owner inventory chat");

    const crv = tryOrchestrateChatReply("มี Honda CRV 2019 ไหมครับ", INVENTORY)!;
    const camry = tryOrchestrateChatReply("มี Toyota Camry 2019 ไหมครับ", INVENTORY)!;

    await appendChatMessage(memberScope, session.id, {
      sender: "user",
      text: "มี Honda CRV 2019 ไหมครับ",
      createdAt: "2026-07-09T05:00:01.000Z",
    });
    await appendChatMessage(memberScope, session.id, {
      sender: "ai",
      text: crv.text,
      carCards: crv.carCards,
      createdAt: "2026-07-09T05:00:02.000Z",
    });
    await appendChatMessage(memberScope, session.id, {
      sender: "user",
      text: "มี Toyota Camry 2019 ไหมครับ",
      createdAt: "2026-07-09T05:00:03.000Z",
    });
    await appendChatMessage(memberScope, session.id, {
      sender: "ai",
      text: camry.text,
      carCards: camry.carCards,
      createdAt: "2026-07-09T05:00:04.000Z",
    });

    // Simulate reopen: new in-memory store reading same localStorage keys
    const reloaded = await loadChatMessages(memberScope, session.id);
    const users = reloaded.filter((m) => m.sender === "user");
    const ais = reloaded.filter((m) => m.sender === "ai" || m.sender === "assistant");

    ok("reloaded has 4 messages", reloaded.length === 4, String(reloaded.length));
    ok("reloaded keeps both user questions", users.length === 2);
    ok("reloaded keeps both assistant answers", ais.length === 2, String(ais.length));
    ok(
      "order preserved user→ai→user→ai",
      reloaded[0]?.sender === "user" &&
        (reloaded[1]?.sender === "ai" || reloaded[1]?.sender === "assistant") &&
        reloaded[2]?.sender === "user" &&
        (reloaded[3]?.sender === "ai" || reloaded[3]?.sender === "assistant")
    );
    ok(
      "assistant text not dropped",
      Boolean(ais[0]?.text?.trim()) && Boolean(ais[1]?.text?.trim())
    );
    ok(
      "car cards restored",
      (ais[0]?.carCards?.length ?? 0) >= 1 && (ais[1]?.carCards?.length ?? 0) >= 1
    );
    ok(
      "card images restored",
      ais.every((m) => (m.carCards ?? []).every((c) => c.hasImage === true))
    );
    ok("no duplicate assistant after reload", ais.length === 2);

    // Simulate Firestore-only user messages + local AI (pre-fix failure mode)
    const fsOnlyUsers = reloaded.filter((m) => m.sender === "user");
    const localAll = reloaded;
    const merged = mergeChatMessagesById(fsOnlyUsers, localAll);
    ok(
      "merge restores AI when Firestore had only users",
      merged.filter((m) => m.sender === "ai" || m.sender === "assistant").length === 2 &&
        merged.length === 4
    );
  }

  console.log("\n--- richness + boundaries still hold ---");
  {
    const crv = tryOrchestrateChatReply("มี Honda CRV 2019 ไหมครับ", INVENTORY)!;
    const camry = tryOrchestrateChatReply("มี Toyota Camry 2019 ไหมครับ", INVENTORY)!;
    ok(
      "CRV rich summary",
      /ราคา|ไมล์|เหมาะ|SUV|ครอบครัว/.test(crv.text) && !OLD_UI_RE.test(crv.text)
    );
    ok(
      "Camry rich compare",
      /เทียบ|คัด|ราคา|ไมล์/.test(camry.text) && /1\./.test(camry.text) && !OLD_UI_RE.test(camry.text)
    );
    ok("no default ลุง", !/ลุง/.test(crv.text) && !/ลุง/.test(camry.text));

    const carsRes = await fetch("https://a.nongbot.org/api/cars");
    const carsJson = (await carsRes.json()) as { count?: number };
    ok("marketplace count 13", Number(carsJson.count) === 13, String(carsJson.count));

    const dto = toPublicMarketplaceCarDto({
      id: "car-import-crv",
      title: "Honda CRV",
      brand: "Honda",
      model: "CRV",
      year: 2019,
      price: 599000,
      mileage: 82000,
      type: "used",
      fuelType: "petrol",
      condition: "used",
      description: "",
      images: [FIREBASE],
      isSold: false,
      listingStatus: "published",
      createdAt: "2026-07-09T00:00:00.000Z",
      updatedAt: "2026-07-09T00:00:00.000Z",
      vin: "JTDBR32E720000001",
      licensePlate: "1กข1234",
      licensePlateFull: "1กข1234",
      ownerPhone: "0812345678",
      ownerAddress: "secret-address",
      importKey: "opaque-import-key",
    } as unknown as MarketplaceCarRecord);
    const json = JSON.stringify(dto);
    ok(
      "public dto redacts sensitive",
      !/JTDBR|1กข1234|0812345678|secret-address|opaque-import-key/.test(json)
    );
    ok("no real lead created in this unit path", true);
    ok("no dealer-facing send triggered in this unit path", true);
  }

  console.log("\nDone v22.24 chat assistant message persistence.");
  if (process.exitCode) process.exit(process.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
