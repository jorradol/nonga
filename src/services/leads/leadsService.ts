import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocFromServer,
  Timestamp
} from "firebase/firestore";
import { db, auth, isMockConfig } from "../../lib/firebase";
import { Lead, LeadEventType, LeadStatus } from "../../types/analytics";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error in Lead Management: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// LocalStorage key for sandbox database fallbacks
const LOCAL_LEADS_KEY = "nonga_leads_sandbox";

export const leadsService = {
  /**
   * Save a Lead to Firestore (or LocalStorage backup)
   */
  async createLead(leadData: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<Lead> {
    const leadId = `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newLead: Lead = {
      ...leadData,
      id: leadId,
      createdAt: now,
      updatedAt: now,
    };

    if (isMockConfig || !db) {
      const existing = this.getLocalLeads();
      const updated = [newLead, ...existing];
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
      return newLead;
    }

    const path = "leads";
    try {
      await setDoc(doc(db, path, leadId), {
        ...newLead,
        // Rules require string ISO timestamps
        createdAt: now,
        updatedAt: now
      });
      return newLead;
    } catch (err) {
      // In case Firestore permissions or rules reject, fallback to safe debug local log
      try {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${leadId}`);
      } catch (mappedErr) {
        console.warn("Firestore rules block/quota exceeded. Saving to local state fallback instead.", err);
        const existing = this.getLocalLeads();
        const updated = [newLead, ...existing];
        localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
        return newLead;
      }
    }
  },

  /**
   * Fetch all Leads for a specific seller (dealer)
   */
  async getLeadsByDealer(dealerId: string): Promise<Lead[]> {
    if (isMockConfig || !db) {
      return this.getLocalLeads().filter(l => l.dealerId === dealerId || !l.dealerId);
    }

    const path = "leads";
    try {
      const q = query(
        collection(db, path),
        where("dealerId", "==", dealerId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const leads: Lead[] = [];
      snapshot.forEach(doc => {
        leads.push(doc.data() as Lead);
      });
      return leads;
    } catch (err) {
      console.warn("Getting leads from Server failed, backing up with local Storage", err);
      return this.getLocalLeads().filter(l => l.dealerId === dealerId || !l.dealerId);
    }
  },

  /**
   * Update lead pipeline status stage
   */
  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
    const now = new Date().toISOString();
    
    if (isMockConfig || !db) {
      const existing = this.getLocalLeads();
      const updated = existing.map(l => l.id === leadId ? { ...l, status, updatedAt: now } : l);
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
      return;
    }

    const path = `leads/${leadId}`;
    try {
      await updateDoc(doc(db, "leads", leadId), {
        status,
        updatedAt: now
      });
    } catch (err) {
      console.warn("Firestore update lead status failed, updating local state", err);
      const existing = this.getLocalLeads();
      const updated = existing.map(l => l.id === leadId ? { ...l, status, updatedAt: now } : l);
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
    }
  },

  /**
   * Update lead internal logs notes
   */
  async updateLeadNotes(leadId: string, notes: string): Promise<void> {
    const now = new Date().toISOString();

    if (isMockConfig || !db) {
      const existing = this.getLocalLeads();
      const updated = existing.map(l => l.id === leadId ? { ...l, notes, updatedAt: now } : l);
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
      return;
    }

    const path = `leads/${leadId}`;
    try {
      await updateDoc(doc(db, "leads", leadId), {
        notes,
        updatedAt: now
      });
    } catch (err) {
      console.warn("Firestore update lead notes failed, updating local state", err);
      const existing = this.getLocalLeads();
      const updated = existing.map(l => l.id === leadId ? { ...l, notes, updatedAt: now } : l);
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
    }
  },

  /**
   * Get leads stored locally in mock sandbox state
   */
  getLocalLeads(): Lead[] {
    const stored = localStorage.getItem(LOCAL_LEADS_KEY);
    if (!stored) {
      const mockInitialLeads: Lead[] = [
        {
          id: "lead-mock-001",
          carId: "car-001",
          carTitle: "BYD Seal Premium AWD Electrifier",
          carPrice: 1599000,
          buyerName: "คุณกิตติศักดิ์ แก้วสะอาด",
          buyerEmail: "kittisak.k@gmail.com",
          buyerPhone: "082-990-1122",
          dealerId: "dealer-nongbot-01",
          dealerName: "NongBot Premium Space Garage",
          eventType: "chat_inquiry",
          status: "new",
          source: "marketplace_detail",
          notes: "สอบถามประกันตัวถังและสเป็กชาร์จเร็ว",
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
        },
        {
          id: "lead-mock-002",
          carId: "car-002",
          carTitle: "Tesla Model 3 Highland Red",
          carPrice: 1650000,
          buyerName: "คุณนารี สิทธิมงคล",
          buyerEmail: "naree.s@gmail.com",
          buyerPhone: "089-445-5678",
          dealerId: "dealer-nongbot-01",
          dealerName: "NongBot Premium Space Garage",
          eventType: "finance_inquiry",
          status: "contacted",
          source: "finance_button",
          notes: "โทรคุยรายละเอียดไฟแนนซ์ดอกเบี้ย 1.99% สนใจเข้ามาดูคันจริงวันเสาร์นี้",
          createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
        },
        {
          id: "lead-mock-003",
          carId: "car-003",
          carTitle: "Porsche Taycan Dynamic White",
          carPrice: 6490000,
          buyerName: "เสี่ยธนา อัครบวรกุล",
          buyerEmail: "thana.rich@highnetworth.com",
          buyerPhone: "081-777-8888",
          dealerId: "dealer-nongbot-01",
          dealerName: "NongBot Premium Space Garage",
          eventType: "contact_seller",
          status: "negotiating",
          source: "marketplace_detail",
          notes: "ติดต่อเสนอโอนเงินสดเต็มจำนวนนัดจัดทีมส่งมอบสัญญารถหรูกรุงเทพ",
          createdAt: new Date(Date.now() - 1000 * 60 * 1800).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 920).toISOString()
        },
        {
          id: "lead-mock-004",
          carId: "car-004",
          carTitle: "Honda Civic FE EL+ Turbo",
          carPrice: 9690000,
          buyerName: "น้องทิว สายซิ่งสระบุรี",
          buyerEmail: "tew.racing@kapook.in.th",
          buyerPhone: "065-112-9900",
          dealerId: "dealer-nongbot-01",
          dealerName: "NongBot Premium Space Garage",
          eventType: "finance_inquiry",
          status: "sold",
          source: "finance_button",
          notes: "อนุมัติสินเชื่อดอกเบี้ยจัดเต็ม ได้รับรถยนต์เป็นที่เรียบร้อยแฮปปี้สุดๆ",
          createdAt: new Date(Date.now() - 1000 * 60 * 4500).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 4000).toISOString()
        },
        {
          id: "lead-mock-005",
          carId: "car-005",
          carTitle: "BMW i4 M50 Carbon Black",
          carPrice: 4299000,
          buyerName: "คุณสมพงษ์ สะสมเกเตอร์",
          buyerEmail: "somphong@gmail.com",
          buyerPhone: "084-231-5544",
          dealerId: "dealer-nongbot-01",
          dealerName: "NongBot Premium Space Garage",
          eventType: "share_listing",
          status: "lost",
          source: "share_action",
          notes: "ยกเลิกเนื่องจากขอราคาพิเศษต่ำเกินแถมเปลี่ยนไปประเมินรถสันดาปคันเก่าเทรดไม่ได้ราคา",
          createdAt: new Date(Date.now() - 1000 * 60 * 12000).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 11000).toISOString()
        }
      ];
      localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(mockInitialLeads));
      return mockInitialLeads;
    }
    return JSON.parse(stored);
  }
};
