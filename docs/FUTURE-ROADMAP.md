# Nong A — Future roadmap notes

## Chat V.3 — Accepted observations / future conversation-quality backlog

**Status:** Accepted with WP‑V3‑08 Owner-browser PASS — **not** a release blocker. Do **not** reopen WP‑V3‑08 without a new Owner order.

Recorded from Owner live acceptance (quality notes only):

- Pronoun consistency can still drift mid-conversation
- Occasional over-certainty wording
- Occasional unsupported market/stock-style claims
- “ปังปุริเย่!” may appear earlier / more often than ideal

Earlier WP‑V3‑07E backlog (still open, non-blocking): burn-smell safety tone; avoid “แน่นอน” when causes are plural; don’t casually recommend tapping a starter; keep pronouns continuous; no mid-chat “สวัสดี”; match answer length to question complexity.

---

## Future Capability Backlog — Automotive Belief & Auspicious Guidance (สายมู)

**Temporary title:** `Automotive Belief & Auspicious Guidance — สายมู ดวง และความเชื่อเกี่ยวกับรถ`

**Status:** Backlog only / **not implemented**. Do **not** fold into WP‑V3‑08. **No new WP number assigned here** — keep numbered Chat V.3 sequence (e.g. WP‑V3‑09+) under Owner/NongD planning; place this capability in Future Capability Backlog until scheduled.

**In-scope concepts (future):**

- Vehicle color by birth day, zodiac, Thai year animal, or user-chosen belief system
- License-plate numbers, digit sums, and meanings across belief traditions
- Auspicious days/times for buying, receiving, registering, or first use
- Beliefs about travel, new cars, and using a car with peace of mind
- Thai customs: vehicle blessing (เจิมรถ), paying respect to the vehicle, auspicious objects/rites
- Light/fun conversation (e.g. whether a car “suits” the owner)
- Multiple belief traditions without claiming any as universal scientific fact

**Control principles (mandatory when scheduled):**

- State politely that guidance is personal belief, not scientific proof
- Never guarantee wealth, luck, safety, or zero accidents
- Never replace inspection, insurance, safe driving, or mechanic advice with belief guidance
- Never frighten users about a car, color, or plate number
- Never pressure purchase of products, rites, or “แก้เคล็ด” services
- If birth date/time or other PII is needed: ask only what is necessary, explain why, and do not store without consent (PDPA)
- Keep belief guidance clearly separated from technical/factual automotive advice
- Tone: friendly and optionally playful; respect all religions and beliefs
- User must be able to choose serious, belief-oriented, or mixed conversation modes
- Before implementation: define reference sources, answer framing, and Safety/PDPA rules

**Suggested sequencing (planning only):** schedule **after** core Chat V.3 conversation quality / safety foundations (known future numbered item from WP‑V3‑08 scope notes: full Safety Layer as **WP‑V3‑11**), and **not** ahead of Owner-assigned WP‑V3‑09/10 without explicit approval. Exact slot TBD by Owner/NongD.

---

## Guided Vehicle Photo Capture (seller mobile)

**Status:** Future phase — after Buyer Search Intent Polish, API cost control, and mobile chat UX are stable.

**Concept:** In mobile chat, Nong A guides home sellers through a **fast-start 3-shot core set** (front, side, rear) so a draft listing can begin immediately from what the seller already has. Optional on-screen framing/templates can suggest supplementary shots later — interior, odometer, engine bay, wheels, trunk, blemishes — to increase buyer trust without blocking the flow.

**Photo guidance principles:**

- **Fast start:** 3 core photos (front, side, rear) are enough for Nong A to draft a first seller post from real data only — no invented specs.
- **Send freely:** sellers may upload more than 3 photos anytime; the system accepts and stores all images — no UX gate asking users to classify “core vs supplementary.”
- **Supplementary, not required:** interior/console, odometer, engine bay, wheels/tires, trunk, blemishes help credibility but must never feel like a gate before drafting.
- Do **not** emphasize “max 10 photos” or “need 5–6 photos before you can start.”
- User-facing copy should say **“ข้อมูลสำคัญที่ควรมีในประกาศ”** / **“ข้อมูลที่ช่วยให้ประกาศครบและน่าเชื่อถือ”** — not “ข้อมูลตามกฎหมายกำหนด” until legal sources are verified.
- Tone: warm seller-coach (“มือทอง”) — draft from what exists, ask missing details gently, encourage optional extras later.
- Goals: sellers start quickly, fewer abandoned drafts, better vision input when extras are added, more credible private listings.
- Privacy (soft warnings): avoid documents, faces, and visible license plates in chat uploads; seller remains responsible for accuracy.

**Implementation note:** Camera/template frames are **not** in v5.4.7b — help/onboarding copy only; guided capture UI comes in a later phase.

**Not in scope until the phase above is done.**

---

## Vision / API strategy (seller photos — future)

**Status:** Design note only — **not implemented** in v5.4.7b (no real Vision mode, no image-selection logic, no API cost system changes).

### Upload & storage (always)

- Users send photos at their convenience; the app **accepts and stores all uploaded images** as today.
- No UX requirement to pick which images are “core” vs “trust boost” before drafting.

### Vision: analyze only when necessary

Vision does **not** need to run on every photo by default. If/when Vision is enabled:

| Tier | Images | Purpose |
|------|--------|---------|
| **Quick Draft set** | Front, side, rear (3 core) | Enough to start a draft listing and rough vehicle classification |
| **Trust Boost / Supporting** | Interior, odometer, engine bay, wheels/tires, trunk, blemishes | Display in listing; optional Vision only when needed |

Supporting images can be **stored and shown in the listing** without being sent to Vision every time.

**Run Vision only when necessary**, e.g.:

- Image may not be a vehicle
- Suspected mismatch (different cars in one batch)
- Heavy duplicate uploads
- Document / PII detected in frame
- User explicitly asks for listing quality check

**Cost control:** cache Vision results by **image hash** to avoid repeat API calls on the same file.

### What Vision may help infer (non-binding)

- Overall vehicle type / body style (sedan, SUV, pickup, hatchback, MPV — approximate)
- Approximate color
- Shot angle / overall composition
- Whether core angle coverage looks reasonably complete

### What Vision must NOT assert as fact

Vision must **not** claim or guarantee:

- Model year
- Trim / sub-model
- Engine spec
- Accident history
- Flood damage
- Single-owner / first-hand
- Dealer service history
- Mileage (if OCR is unclear)
- “Good / bad condition” as a warranty

**Important listing facts must be confirmed by the seller** — Nong A drafts from provided data and asks politely for gaps; it does not invent specs.
