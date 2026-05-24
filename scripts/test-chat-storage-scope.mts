import {
  getChatStorageScope,
  chatSessionsLocalKey,
} from "../src/utils/chatStorageScope.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

const thorDealer = getChatStorageScope({
  uid: "guest-user-100",
  role: "dealer",
  dealerId: THOR_AUTO_DEALER_ID,
});

const otherDealer = getChatStorageScope({
  uid: "guest-user-100",
  role: "dealer",
  dealerId: "dealer-nongbot-01",
});

const consumer = getChatStorageScope({
  uid: "guest-user-100",
  role: "member",
});

assert(
  thorDealer.storageKey !== otherDealer.storageKey,
  "Different dealers must have different storage keys"
);
assert(
  thorDealer.storageKey !== consumer.storageKey,
  "Dealer vs consumer must differ"
);
assert(
  thorDealer.storageKey.includes(THOR_AUTO_DEALER_ID),
  "Thor dealer scope includes thor-auto"
);
assert(
  chatSessionsLocalKey(thorDealer.storageKey).startsWith("nong-a-chat-sessions:"),
  "Sessions key uses nong-a-chat prefix"
);
assert(
  !chatSessionsLocalKey(thorDealer.storageKey).includes("nonga_chat_sessions"),
  "Legacy global key prefix not used"
);

console.log("--- Chat storage scope tests passed ---");
