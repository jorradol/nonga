/**
 * Chat-first guest access regression
 * npm run test:v50-chat-guest-access
 */
import { chromium, type Browser } from "playwright";
import {
  CHAT_GUEST_LOGIN_SAVE_MESSAGE,
  CHAT_MEMBER_SELLER_FLOW_MESSAGE,
  resolveChatDraftSaveBlockMessage,
} from "../src/services/ai/chat/chatDraftAccess.ts";
import {
  getChatStorageScope,
  resolveChatUserId,
  GUEST_FALLBACK_UID,
  chatSessionsLocalKey,
  chatMessagesLocalKey,
} from "../src/utils/chatStorageScope.ts";
import {
  resolveViewFromPathname,
  LEGACY_APP_VIEW_KEYS,
} from "../src/utils/appRouteSync.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

const BASE_URL = process.env.NONGA_TEST_BASE_URL || "http://localhost:3000";

function buildUser(
  uid: string,
  role: "member" | "dealer" | "admin",
  extra: Record<string, unknown> = {}
) {
  return {
    uid,
    email: `${uid}@test.local`,
    displayName: `${role} test`,
    photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
    providerId: "password",
    isSimulated: true,
    role,
    status: "active",
    membershipType: role === "dealer" ? "dealer" : "free",
    postLimit: role === "member" ? 5 : 999999,
    totalPosts: 0,
    favoriteCars: [],
    ...(role === "dealer"
      ? { dealerId: "thor-auto", showroomName: "Thor Auto Demo" }
      : {}),
    ...extra,
  };
}

type OpenPageOptions = {
  legacyView?: string;
  seedGuestChatSession?: boolean;
};

async function openPage(
  browser: Browser,
  session: Record<string, unknown> | null,
  options: OpenPageOptions = {}
) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const guestScope = getChatStorageScope({ uid: GUEST_FALLBACK_UID, role: "guest" });
  await page.addInitScript(
    ({ session, legacyView, seedGuestChatSession, guestSessionsKey, guestMessagesKey }) => {
      if (session) {
        const uid = String((session as { uid?: string }).uid ?? "");
        localStorage.setItem("nonga_auth_session", JSON.stringify(session));
        localStorage.setItem(
          "nonga_simulated_users",
          JSON.stringify({ [uid]: session })
        );
      } else {
        localStorage.removeItem("nonga_auth_session");
        localStorage.removeItem("nonga_simulated_users");
        sessionStorage.removeItem("nonga_anonymous_chat_scope_id");
        for (const key of Object.keys(localStorage)) {
          if (
            key.includes("nonga_chat_sessions") ||
            key.includes("nonga_chat_messages")
          ) {
            localStorage.removeItem(key);
          }
        }
      }
      if (legacyView) {
        localStorage.setItem("nonga_last_view", legacyView);
        localStorage.setItem("nonga_current_view", legacyView);
      }
      if (seedGuestChatSession) {
        const sessionId = "legacy-guest-session";
        localStorage.setItem(
          guestSessionsKey,
          JSON.stringify([
            {
              id: sessionId,
              title: "Legacy guest chat",
              userId: guestSessionsKey,
              storageScopeKey: guestSessionsKey,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ])
        );
        localStorage.setItem(
          guestMessagesKey,
          JSON.stringify({
            [sessionId]: [
              {
                id: "m1",
                sender: "user",
                text: "สวัสดีน้องเอ",
                timestamp: new Date().toISOString(),
              },
            ],
          })
        );
      }
    },
    {
      session,
      legacyView: options.legacyView,
      seedGuestChatSession: options.seedGuestChatSession,
      guestSessionsKey: chatSessionsLocalKey(guestScope.storageKey),
      guestMessagesKey: chatMessagesLocalKey(guestScope.storageKey),
    }
  );
  return page;
}

const CHAT_WELCOME_LINES = [
  "คุยรถยนต์สับๆ กับ",
  "น้องเอ",
  "สวัสดีครับ ผมคือน้องเอ อยากซื้อรถแบบไหน บอกงบ รุ่น หรือการใช้งานมาได้เลยครับ",
] as const;

async function assertPathShowsChat(page: import("playwright").Page, label: string) {
  await page.waitForTimeout(1200);
  const pathname = new URL(page.url()).pathname;
  assert(
    pathname === "/" || pathname === "/chat",
    `${label}: pathname is chat entry (${pathname})`
  );
  assert(
    await page.locator("#chat-container").isVisible().catch(() => false),
    `${label}: #chat-container visible`
  );
  assert(
    await page.locator("#chat-textarea-elt").isVisible().catch(() => false),
    `${label}: chat composer visible`
  );
  const body = await page.locator("body").innerText();
  assert(
    !body.includes("กลับหน้าแรก"),
    `${label}: no back-to-home button on chat`
  );
  assert(
    body.includes("ไปที่ตลาดรถ"),
    `${label}: marketplace button present on chat`
  );
  assert(
    body.includes("คุยกับน้องเอ AI") || body.includes("น้องเอ"),
    `${label}: chat chrome visible`
  );
  assert(
    !(await page.locator("[data-testid='home-landing-hero']").isVisible().catch(() => false)),
    `${label}: orange Home hero not shown`
  );
  const heroFrame = page.locator("#chat-hero-frame");
  if (await heroFrame.isVisible().catch(() => false)) {
    for (const line of CHAT_WELCOME_LINES) {
      assert(body.includes(line), `${label}: empty-state welcome contains "${line}"`);
    }
  }
}

const GUEST_SEND_SMOKE_MESSAGE = "หารถเก๋งงบไม่เกิน 300,000";

async function assertGuestCanSendFirstMessage(
  page: import("playwright").Page,
  path: string,
  label: string
) {
  const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}guest-send-smoke=v1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector("#chat-textarea-elt", { timeout: 20_000 });
  await page.locator("#chat-textarea-elt").fill(GUEST_SEND_SMOKE_MESSAGE);
  await page.locator("#send-message-btn").click();
  await page.waitForTimeout(4000);
  const body = await page.locator("body").innerText();
  assert(
    !body.includes("ส่งข้อความไม่สำเร็จครับ"),
    `${label}: guest send does not show composer failure`
  );
  assert(
    body.includes(GUEST_SEND_SMOKE_MESSAGE),
    `${label}: guest user message appears in thread`
  );
}

async function assertPathShowsOrangeHome(page: import("playwright").Page, label: string) {
  await page.waitForTimeout(900);
  assert(new URL(page.url()).pathname === "/home", `${label}: pathname is /home`);
  assert(
    await page.locator("[data-testid='home-landing-hero']").isVisible().catch(() => false),
    `${label}: orange Home landing visible`
  );
  const chatContainer = page.locator("#chat-container");
  assert(
    !(await chatContainer.isVisible().catch(() => false)),
    `${label}: no full chat on /home`
  );
}

// --- Unit: draft save guards ---
assert(
  resolveChatDraftSaveBlockMessage({
    isSignedIn: false,
    chatScope: getChatStorageScope({ uid: GUEST_FALLBACK_UID, role: "guest" }),
    isDealer: false,
    isAdmin: false,
  }) === CHAT_GUEST_LOGIN_SAVE_MESSAGE,
  "guest save draft requires login message"
);

assert(
  resolveChatDraftSaveBlockMessage({
    isSignedIn: true,
    chatScope: getChatStorageScope({ uid: "member-1", role: "member" }),
    isDealer: false,
    isAdmin: false,
  }) === CHAT_MEMBER_SELLER_FLOW_MESSAGE,
  "member save dealer draft uses seller flow message"
);

assert(
  resolveChatDraftSaveBlockMessage({
    isSignedIn: true,
    chatScope: getChatStorageScope({
      uid: "dealer-1",
      role: "dealer",
      dealerId: "thor-auto",
    }),
    isDealer: true,
    isAdmin: false,
  }) === null,
  "dealer can save draft from chat"
);

const guestScopeA = getChatStorageScope({ uid: GUEST_FALLBACK_UID, role: "guest" });
const guestScopeB = getChatStorageScope({ uid: GUEST_FALLBACK_UID, role: "guest" });
assert(
  guestScopeA.storageKey.startsWith("user:guest-"),
  "anonymous guest uses session-scoped storage key prefix"
);
assert(
  guestScopeA.storageKey === guestScopeB.storageKey,
  "same session reuses anonymous guest storage key"
);

const memberScope = getChatStorageScope({ uid: "member-abc", role: "member" });
assert(
  memberScope.storageKey !== guestScopeA.storageKey,
  "member chat history does not share guest storage key"
);

const guestUid = resolveChatUserId({ uid: GUEST_FALLBACK_UID, role: "guest" });
const memberUid = resolveChatUserId({ uid: "member-abc", role: "member" });
assert(guestUid !== memberUid, "guest and member resolve different chat user ids");

assert(resolveViewFromPathname("/") === "chat", "/ maps to chat view");
assert(resolveViewFromPathname("/chat") === "chat", "/chat maps to chat view");
assert(resolveViewFromPathname("/home") === "home", "/home maps to home view");
assert(
  resolveViewFromPathname("/unknown-path") === "chat",
  "unknown path defaults to chat"
);
assert(LEGACY_APP_VIEW_KEYS.length >= 1, "legacy view keys defined");

// --- Browser smoke ---
console.log("\n=== Browser chat-first smoke ===");
console.log(BASE_URL);

const browser = await chromium.launch({ headless: true });
try {
  let page = await openPage(browser, null);
  await page.goto(`${BASE_URL}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const guestBody = await page.locator("body").innerText();
  assert(
    !guestBody.includes("บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ"),
    "guest root is not blocked by dealer guard"
  );
  await assertPathShowsChat(page, "guest opens / as chat");

  page = await openPage(browser, null, { legacyView: "home" });
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertPathShowsChat(page, "legacy pinned home on / still shows chat");

  page = await openPage(browser, null, { seedGuestChatSession: true });
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertPathShowsChat(page, "stale guest storage on /");
  const staleSessionRows = await page.locator('[id^="chat-session-item-"]').count();
  assert(staleSessionRows === 0, "guest / must not list old anonymous sessions in sidebar");
  assert(
    await page.locator("#empty-sidebar").isVisible().catch(() => false),
    "guest / sidebar shows empty history state"
  );
  assert(
    await page.locator("#chat-hero-frame").isVisible().catch(() => false),
    "guest / shows welcome hero instead of old messages"
  );

  page = await openPage(browser, null);
  await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertPathShowsChat(page, "guest /chat entry");
  assert(
    (await page.locator('[id^="chat-session-item-"]').count()) === 0,
    "guest /chat must not auto-select old conversation"
  );

  page = await openPage(browser, null);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(600);
  await page.locator("#new-chat-btn").click();
  await page.waitForTimeout(600);
  assert(
    (await page.locator('[id^="chat-session-item-"]').count()) >= 1,
    "new chat button creates a guest session"
  );
  assert(
    await page.locator("#chat-textarea-elt").isVisible().catch(() => false),
    "new guest chat keeps composer ready"
  );

  page = await openPage(browser, null);
  await assertGuestCanSendFirstMessage(page, "/", "guest / first message send");
  await assertGuestCanSendFirstMessage(page, "/chat", "guest /chat first message send");

  page = await openPage(browser, null);
  await page.goto(`${BASE_URL}/#chat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(600);
  const legacyHashPath = new URL(page.url()).pathname;
  assert(legacyHashPath === "/", "legacy /#chat normalizes to /");
  await assertPathShowsChat(page, "legacy /#chat shows chat");

  page = await openPage(browser, null);
  await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertPathShowsChat(page, "guest opens /chat as chat");

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(500);
  await page.goto(`${BASE_URL}/chat`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(500);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertPathShowsChat(page, "no redirect loop between / and /chat");

  page = await openPage(browser, null);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByRole("button", { name: "ไปที่ตลาดรถ" }).click();
  await page.waitForTimeout(800);
  assert(
    new URL(page.url()).pathname === "/marketplace",
    "chat marketplace button goes to /marketplace"
  );

  page = await openPage(browser, null);
  await page.goto(`${BASE_URL}/home`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertPathShowsOrangeHome(page, "/home shows orange Home");

  page = await openPage(browser, null);
  await page.goto(`${BASE_URL}/marketplace`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(600);
  assert(
    new URL(page.url()).pathname === "/marketplace",
    "/marketplace route works"
  );

  page = await openPage(browser, buildUser("member-chat-guest", "member"));
  await page.goto(`${BASE_URL}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(800);
  const memberBody = await page.locator("body").innerText();
  assert(
    !memberBody.includes("บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ"),
    "member root is not dealer-guard blocked"
  );
  await assertPathShowsChat(page, "member opens / as chat");

  await page.goto(`${BASE_URL}/chat`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(800);
  assert(
    await page.locator("#chat-textarea-elt").isVisible().catch(() => false),
    "member can see chat composer on /chat"
  );

  page = await openPage(browser, buildUser("member-chat-guest", "member"));
  await page.goto(`${BASE_URL}/dealer`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(500);
  const memberDealerBody = await page.locator("body").innerText();
  assert(
    memberDealerBody.includes("บัญชีนี้ยังไม่ได้เปิดใช้งานเป็นสมาชิกดีลเลอร์ครับ"),
    "member still blocked from dealer portal"
  );

  page = await openPage(browser, buildUser("dealer-chat-guest", "dealer"));
  await page.goto(`${BASE_URL}/chat`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(800);
  assert(
    await page.locator("#chat-textarea-elt").isVisible().catch(() => false),
    "dealer can open chat on /chat"
  );
} finally {
  await browser.close();
}

console.log("\n--- Chat guest access tests passed ---");
