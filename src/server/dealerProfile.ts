import fs from "fs";
import path from "path";
import { THOR_AUTO_DEALER_ID } from "../utils/dealerIdentity";

export interface DealerProfileRecord {
  dealerId: string;
  showroomName: string;
  ownerName: string;
  phone: string;
  address: string;
  logoUrl?: string;
  businessHours?: string;
  lineId?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
  updatedAt: string;
}

const PROFILE_FILE = path.resolve(process.cwd(), "data/dealer-profiles.json");

const DEFAULT_PROFILES: DealerProfileRecord[] = [
  {
    dealerId: THOR_AUTO_DEALER_ID,
    showroomName: "Thor Auto (ธอร์ ออโต้)",
    ownerName: "คุณณรงค์ จรดล",
    phone: "0815553335",
    address: "เขตมีนบุรี จังหวัดกรุงเทพ",
    businessHours: "จันทร์–เสาร์ 09:00–18:00",
    lineId: "@thorauto",
    updatedAt: new Date().toISOString(),
  },
];

let cache: DealerProfileRecord[] | null = null;

function readProfiles(): DealerProfileRecord[] {
  try {
    if (!fs.existsSync(PROFILE_FILE)) return [...DEFAULT_PROFILES];
    const raw = fs.readFileSync(PROFILE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DealerProfileRecord[]) : [...DEFAULT_PROFILES];
  } catch {
    return [...DEFAULT_PROFILES];
  }
}

function writeProfiles(list: DealerProfileRecord[]): void {
  fs.mkdirSync(path.dirname(PROFILE_FILE), { recursive: true });
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(list, null, 2), "utf8");
}

export function loadDealerProfiles(): DealerProfileRecord[] {
  if (cache === null) cache = readProfiles();
  return cache;
}

export function getDealerProfile(dealerId: string): DealerProfileRecord | null {
  return loadDealerProfiles().find((p) => p.dealerId === dealerId) ?? null;
}

export function upsertDealerProfile(
  dealerId: string,
  patch: Partial<DealerProfileRecord>
): DealerProfileRecord {
  const list = loadDealerProfiles();
  const idx = list.findIndex((p) => p.dealerId === dealerId);
  const now = new Date().toISOString();

  if (idx < 0) {
    const created: DealerProfileRecord = {
      dealerId,
      showroomName: patch.showroomName ?? "",
      ownerName: patch.ownerName ?? "",
      phone: patch.phone ?? "",
      address: patch.address ?? "",
      logoUrl: patch.logoUrl,
      businessHours: patch.businessHours,
      lineId: patch.lineId,
      facebook: patch.facebook,
      tiktok: patch.tiktok,
      website: patch.website,
      updatedAt: now,
    };
    const next = [created, ...list];
    cache = next;
    writeProfiles(next);
    return created;
  }

  const updated: DealerProfileRecord = {
    ...list[idx],
    ...patch,
    dealerId: list[idx].dealerId,
    updatedAt: now,
  };
  const next = [...list];
  next[idx] = updated;
  cache = next;
  writeProfiles(next);
  return updated;
}
