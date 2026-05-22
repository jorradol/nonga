import { SeoLandingPage, SearchRankingInsight, DynamicSeoMeta, SeoBreadcrumb } from "../../types/seo";
import { Car } from "../../types";

class SeoService {
  /**
   * Generates a clean URL slug from any search phrase/keyword
   */
  generateSlug(keyword: string): string {
    return keyword
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9ก-๙\s-]/g, "") // support Thai characters
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /**
   * List of core pre-cached indexable SEO category pages
   */
  getPrecachedLandingPages(): SeoLandingPage[] {
    return [
      {
        id: "seo_toyota_bkk",
        slug: "toyota-used-bangkok",
        keyword: "Toyota มือสอง กรุงเทพ",
        title: "ซื้อขาย Toyota มือสอง กรุงเทพ สภาพดี ราคาคุ้มค่าที่สุด | Nong A",
        description: "ค้นพบรถโตโยต้ามือสองคุณภาพดีในกรุงเทพมหานคร ราคาโรงงาน ตรวจเช็คสภาพประวัติศูนย์ครบ 150 จุด ยินดีให้คำปรึกษาฟรี จัดไฟแนนซ์ง่าย อนุมัติไว",
        h1: "แหล่งรวม Toyota มือสอง กรุงเทพฯ สภาพปังราคามิตรภาพ 🚗",
        introContent: "หากคุณกำลังมองหา รถโตโยต้ามือสอง สภาพดี ในเขตกรุงเทพฯและปริมณฑล มั่นใจได้เลยว่า Nong A ได้ทำการคัดเกรดรถบ้านแท้ 100% สภาพปังปุริเย่ เพื่อตอบสนองทุกโจทย์ความประหยัดและการใช้งานที่ยาวนาน คุ้มค่าเงินทุกบาทแน่นอนครับ!",
        detailedContent: "ตลาดรถยนต์มือสองกรุงเทพฯ มีความต้องการใช้งาน Toyota สูงเป็นอันดับหนึ่ง เนื่องจากความคงทน อะไหล่หาง่าย และศูนย์บริการครอบคลุม รถที่เรานำเสนอผ่านการตรวจสอบระบบขับเคลื่อน โครงสร้างตัวไฟแนนซ์ และรับประกันไม่มีประวัติชนหนัก พลิกคว่ำ หรือจมน้ำ ของแท้นอนใจได้ครับ!",
        category: "brand-location",
        canonicalUrl: "https://nonga-car.com/seo/toyota-used-bangkok",
        ogImage: "https://images.unsplash.com/photo-1621007947382-cc34f214ff2e?auto=format&fit=crop&q=80&w=800",
        filters: { brand: "Toyota", city: "กรุงเทพ" },
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "ซื้อขาย Toyota มือสอง กรุงเทพ สภาพดี",
          "description": "ค้นพบรถโตโยต้ามือสองคุณภาพดีในกรุงเทพมหานคร ราคาคุ้มค่า ตรวจเช็คสภาพครบจุด",
          "breadcrumb": "Home > ซื้อรถ > Toyota > กรุงเทพ"
        }
      },
      {
        id: "seo_civic_fe",
        slug: "honda-civic-fe-used",
        keyword: "Honda Civic FE มือสอง",
        title: "Honda Civic FE มือสอง สภาพนางฟ้า ฟรีดาวน์ ดอกเบี้ยพิเศษ | Nong A",
        description: "โปรโมชั่นพิเศษ Honda Civic FE โฉมล่าสุดมือสอง สเป็คแจ่มแต่งงามรอบคัน เลขไมล์แท้วิ่งน้อย เช็คประวัติห้างได้เลยวันนี้ที่ Nong A รถเด่นเกรดพรีเมียม",
        h1: "พรีวิว Honda Civic FE มือสอง ตัวตึงหล่อเท่สะกิดใจวัยรุ่น 💎",
        introContent: "อยากขับซีวิคไม่ต้องคิดนาน! สำหรับ Honda Civic FE มือสอง รุ่นฮิตโชว์หล่อเต็มระดับ คันนี้แต่งตัวตึงสเกลสปอร์ต ออพชั่นเลอค่าเดือดๆ นิ่มนวลพรีเมียมขับขี่สมบูรณ์เนี้ยบสุดขั้ว",
        detailedContent: "Honda Civic Generation 11 (FE) ได้รับการโหวตจากวัยรุ่นสร้างตัวว่าเป็นรถสมรรถนะดีเยี่ยม ดีไซน์ภายนอกเพรียวมินิมอล ภายในคอนโซลตะแกรงรังผึ้งหรูหราอลังการ ประหยัดเชื้อเพลิงด้วยขุมพลัง VTEC Turbo ขับเคลื่อนสนุกเร้าใจ คันนี้มีคนทักทายข้างถนนแน่นอนเพลินจิต!",
        category: "model-specific",
        canonicalUrl: "https://nonga-car.com/seo/honda-civic-fe-used",
        ogImage: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800",
        filters: { brand: "Honda", model: "Civic" },
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Honda Civic FE มือสอง สภาพนางฟ้า",
          "description": "โปรโมชั่นพิเศษ Honda Civic FE โฉมล่าสุดมือสอง เลขไมล์แท้วิ่งน้อย",
          "breadcrumb": "Home > ซื้อรถ > Honda > Civic"
        }
      },
      {
        id: "seo_ev_used",
        slug: "used-ev-cars",
        keyword: "รถ EV มือสอง",
        title: "ซื้อขายรถยนต์ไฟฟ้า EV มือสอง ราคาถูก ประหยัดพลังงาน | Nong A",
        description: "ส่องศูนย์รวมรถยนต์ไฟฟ้า EV มือสอง สภาพป้ายแดง แบตเตอรี่ถนอมอย่างดี ตรวจเช็คระดับความเสื่อม SOH แบตเตอรี่ชัวร์ 100% จัดเต็มโปรลับช่วยโอน",
        h1: "ต้อนรับอนาคตสีเขียวกับ รถ EV มือสอง ราคาชิวใจสะท้าน 🔋",
        introContent: "ประหยัดค่าเดินทางหลักแสนด้วย รถยนต์ EV มือสอง คุณภาพประณีต คัดสรรอย่างถนอมจากเจ้าของเดิมที่ใช้จอดในร่มตลอด แบตเตอรี่เกรดเนี้ยบพร้อมโปรโมชั่นพิเศษล้นกระเป๋าเลยครับ!",
        detailedContent: "ยุคพลังงานหมุนเวียนสะอาด น้องเอคัดสรรรถ EV ยอดนิยม เช่น BYD Atto 3, GWM Ora Good Cat, Tesla Model 3 เพื่อคนไทยโดยเฉพาะ ตรวจเช็ควาล์วไฟฟ้า แฟลชกล่องซอฟต์แวร์แผงวงจรครบสมบูรณ์ มั่นใจอุ่นใจในการออกทริปเดินทางไกลลื่นไหลแน่นอนครับ",
        category: "car-type",
        canonicalUrl: "https://nonga-car.com/seo/used-ev-cars",
        ogImage: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800",
        filters: { electricOnly: true },
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "ซื้อขายรถยนต์ไฟฟ้า EV มือสอง",
          "description": "ศูนย์รวมรถยนต์ไฟฟ้า EV มือสอง สภาพป้ายแดง แบตเตอรี่ถนอมอย่างดี",
          "breadcrumb": "Home > ประเภทรถ > รถยนต์ไฟฟ้า EV"
        }
      },
      {
        id: "seo_cheap_used",
        slug: "affordable-used-cars",
        keyword: "รถมือสองราคาถูก",
        title: "แหล่งรวมรถมือสองราคาถูก ผ่อนน้อย ผ่อนสบายสวีทคลับ | Nong A",
        description: "สืบเสาะรถบ้านมือสองราคาถูกผ่อนถูก ผ่อนสองช้อนชาเริ่มต้นวันละหลักสิบบาท สเป็คเอี่ยมอ่อง สภาพดีใช้งานดีเยี่ยม ไม่ลุยน้ำท่วมร้อยเปอร์เซ็นต์",
        h1: "รวมขุมคลัง รถมือสองราคาถูก คุณภาพแน่น สภาพคุ้มค่าเกินล้าน 💸",
        introContent: "งบน้อยไม่ต้องสั่นครับพี่ชายพี่สาว! คลังรถบ้านมือสองคุณภาพคุ้มราคา คัดเกรดเน้นๆ เฉพาะคันที่ตัวเครื่องพรีเมียมแน่น ฟังก์ชันครบ ทนทาน ไม่จุกจิกเพื่อการพาณิชย์และการเดินทางครอบครัวหลักแสนบาท!",
        detailedContent: "ประหยัดต้นทุนชีวิตกับรุ่นรถยนต์ยอดนิยมอย่าง Toyota Yaris, Honda Jazz, Suzuki Swift ราคาตลาดเบาหวิว จัดโปรดอกเบี้ยพิเศษ 0% หรือโปรช่วยผ่อนนานสูงสุด 6 เดือนเพื่อแบ่งเบาความสุขของคุณและคนที่ท่านรักครับผม",
        category: "price",
        filters: { maxPrice: 400000 },
        canonicalUrl: "https://nonga-car.com/seo/affordable-used-cars",
        ogImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "แหล่งรวมรถมือสองราคาถูก ผ่อนสบาย",
          "description": "คลังรถบ้านมือสองคุณภาพคุ้มราคา คัดเกรดเน้นๆ ผ่อนถูกพิเศษ",
          "breadcrumb": "Home > ซื้อรถ > รถราคาประหยัด"
        }
      },
      {
        id: "seo_single_owner",
        slug: "single-owner-cars",
        keyword: "รถบ้านมือเดียว",
        title: "รถบ้านมือเดียว สภาพเดิมบาง น็อตไม่ขยับ รับประกันคุณภาพ | Nong A",
        description: "ส่องคัดสรรรถบ้านมือเดียว (One Owner Cars) ป้ายแดงออกห้าง การดูแลประวัติเล่มสะอาดกริบ ขับดีเหมือนใหม่ ไร้อุบัติเหตุทุบตีประตัวอย่างพรีเมียม",
        h1: "หรูเนี้ยบกริ๊บกับ รถบ้านมือเดียว ป้ายแดงออกห้างดูแลประคบประหงม ✨",
        introContent: "ประวัติตรวจสอบได้ระดับเกรด A+! รถบ้านมือเดียวของแท้ เจ้าของเก่าทะนุถนอมประหนึ่งลูกพรีเมียม เล่มคู่มือ กุญแจสำรองพกพานิ่มครบถ้วนสองดอก น็อตภายในรถยนต์ไม่ขยับซักตัวเดียวครับพี่!",
        detailedContent: "การซื้อรถบ้านมือเดียวถือเป็นดีลทองในอุดมคติของทุกคน คันนี้น็อตตัวถังเดิมบาง ยางบิวท์สภาพสวยสะอาด คลัตช์เครื่องเกียร์ทำงานรอบมวลสมบูรณ์เฉี่ยว สูดกลิ่นความหอมละมุนดั้งเดิมออกห้างได้สบายๆ ท้าส่องสเป็คตัวจริงคุ้มค่าแน่นอน",
        category: "condition",
        filters: { conditionPattern: "มือเดียว" },
        canonicalUrl: "https://nonga-car.com/seo/single-owner-cars",
        ogImage: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=800",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "รถบ้านมือเดียว สภาพเดิมบาง",
          "description": "รถบ้านมือเดียวของแท้ เจ้าของเก่าดูแลรักษาพรีเมียม เล่มทะเบียนสวยใส",
          "breadcrumb": "Home > ซื้อรถ > รถบ้านมือเดียว"
        }
      }
    ];
  }

  /**
   * Generates dynamic SEO Page based on keyword if it doesn't already exist
   */
  async generateDynamicSeoPage(keyword: string): Promise<SeoLandingPage> {
    const slug = this.generateSlug(keyword);
    
    // Check if we can summon Gemini to write professional descriptions and keywords
    try {
      const response = await fetch("/api/seo/generate-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyword, slug }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.page) {
          return result.page;
        }
      }
    } catch (e) {
      console.warn("Express AI SEO server route failed, using rich local fallback generator...", e);
    }

    // High quality fallback dynamic templater
    const brandMatch = keyword.match(/honda|toyota|nissan|byd|tesla|mazda|ford|isuzu|mg|hyundai/i);
    const matchedBrand = brandMatch ? brandMatch[0] : "";
    const cleanBrandCapital = matchedBrand ? matchedBrand.charAt(0).toUpperCase() + matchedBrand.slice(1).toLowerCase() : "รถยนต์";
    
    const isEv = keyword.toLowerCase().includes("ev") || keyword.includes("ไฟฟ้า");
    const isCheap = keyword.includes("ถูก") || keyword.includes("ราคาประหยัด") || keyword.includes("งบน้อย");

    const filters: SeoLandingPage["filters"] = {};
    if (matchedBrand) filters.brand = cleanBrandCapital;
    if (isEv) filters.electricOnly = true;
    if (isCheap) filters.maxPrice = 500000;

    return {
      id: `dynamic_seo_${Date.now()}`,
      slug,
      keyword,
      title: `ซื้อขาย ${keyword} สภาพแจ่ม ราคาพิเศษ การันตีศูนย์ตรวจสอบ | Nong A`,
      description: `ค้นพบ ${keyword} ตัวท็อปมือสองรถบ้านแท้ 100% สภาพพร้อมเปิดตัวปังปุริเย่ คล่องแคล่วดีมีเอกสารพรั่งพร้อมจัดดาวน์ง่ายสุดๆ`,
      h1: `${keyword} แหล่งรวมตัวสะกดใจคนรักรถตัวจริง 🚀`,
      introContent: `ยินดีต้อนรับเข้าสู่อาณาจักรยานยนต์ชั้นนำของประเทศไทย หากท่านกำลังสืบหาข้อมูลเชิงวิเคราะห์ของ ${keyword} ที่มีคุณภาพสมราคา ไม่ช้ำ ไม่จอดตากแดดตากลม น้องเอคัดสรรรถบ้านประวัติเลอค่ามาเสิร์ฟตรงหน้าท่านถึงที่วันนี้ครับ!`,
      detailedContent: `ความสนุกและอิสรภาพแห่งไลฟ์สไตล์การขับเคลื่อนรอคุณอยู่กับดีลสุดว้าว ${keyword} ผ่านมาตรวัดประเมินความปลอดภัย Nong A Standard ประวัติเช็คศูนย์สะอาดสะอ้าน ช่วยผ่อน ประกันภัยครบสูตร เติมเต็มจังหวะชีวิตสะดุดตาของท่านอย่างมั่นใจสูงสุด`,
      category: isEv ? "car-type" : isCheap ? "price" : "brand-location",
      canonicalUrl: `https://nonga-car.com/seo/${slug}`,
      ogImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=800",
      filters,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": keyword,
        "description": `ค้นพบรถบ้านแท้มือสองสำหรับคอลเลกชัน ${keyword}`,
        "breadcrumb": `Home > ค้นหา > ${keyword}`
      }
    };
  }

  /**
   * Filter existing cars from store matching the specific SEO Landing Page criteria
   */
  recommendCarsForPage(page: SeoLandingPage, allCars: Car[]): Car[] {
    if (!allCars || allCars.length === 0) return [];
    
    return allCars.filter((car) => {
      // 1. Brand filter
      if (page.filters.brand && car.brand.toLowerCase() !== page.filters.brand.toLowerCase()) {
        return false;
      }
      // 2. Model filter
      if (page.filters.model && !car.model.toLowerCase().includes(page.filters.model.toLowerCase())) {
        return false;
      }
      // 3. ElectricOnly filter
      if (page.filters.electricOnly && car.fuelType !== "electric") {
        return false;
      }
      // 4. MaxPrice filter
      if (page.filters.maxPrice && car.price > page.filters.maxPrice) {
        return false;
      }
      // 5. Condition / owner word match
      if (page.filters.conditionPattern) {
        const pattern = page.filters.conditionPattern;
        const inDescription = car.description?.includes(pattern);
        const inCondition = car.condition?.includes(pattern);
        if (!inDescription && !inCondition) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Generates ranking and difficulty alerts for the SEO Manager
   */
  async getAiSearchInsights(pages: SeoLandingPage[]): Promise<SearchRankingInsight[]> {
    try {
      const response = await fetch("/api/seo/insights");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.insights) return result.insights;
      }
    } catch (e) {
      console.warn("Express SEO Insights endpoint fail, using smart templated metrics", e);
    }

    // Static fallback insights
    return pages.map((p, index) => {
      const volumes = [15000, 8400, 12000, 18500, 5200];
      const ranks = [3, 5, 8, 2, 4];
      const backlinks = [12, 8, 15, 6, 9];
      const ctrs = ["12.5%", "9.8%", "4.2%", "16.8%", "11.2%"];
      const difficulties: SearchRankingInsight["difficulty"][] = ["쉬움 (Low)", "중간 (Medium)", "중간-높음 (High-Medium)", "높음 (High)", "쉬움 (Low)"];

      return {
        slug: p.slug,
        keyword: p.keyword,
        currentRank: ranks[index % ranks.length],
        monthlyVolume: volumes[index % volumes.length],
        difficulty: difficulties[index % difficulties.length],
        backlinksCount: backlinks[index % backlinks.length] + Math.floor(Math.random() * 3),
        ctrEstimate: ctrs[index % ctrs.length]
      };
    });
  }

  /**
   * Dynamically write breadcrumbs for crawlers and humans
   */
  getSeoBreadcrumbs(page: SeoLandingPage): SeoBreadcrumb[] {
    return [
      { label: "หน้าแรก", view: "home" },
      { label: "หมวดหมู่ทั้งหมด", view: "marketplace" },
      { label: page.keyword, slug: page.slug }
    ];
  }

  /**
   * Dynamic JSON-LD structured schema builder for ProductLists, breadcrumbs and local business
   */
  compileJsonLd(page: SeoLandingPage, recommendedCars: Car[]): Record<string, any> {
    const defaultSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://nonga-car.com/#website",
          "url": "https://nonga-car.com/",
          "name": "Nong A",
          "description": "ตลาดรถอัจฉริยะสำหรับเต็นท์รถและผู้ขายรถ ใช้งานง่ายด้วย AI Smart Import และระบบจัดการรถครบวงจร"
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${page.canonicalUrl}#breadcrumb`,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "หน้าหลัก", "item": "https://nonga-car.com/" },
            { "@type": "ListItem", "position": 2, "name": "รถยนต์หรู", "item": "https://nonga-car.com/marketplace" },
            { "@type": "ListItem", "position": 3, "name": page.keyword, "item": page.canonicalUrl }
          ]
        },
        {
          "@type": "ItemList",
          "@id": `${page.canonicalUrl}#itemlist`,
          "name": `รถยนต์ขายดีจำพวก ${page.keyword}`,
          "description": page.description,
          "numberOfItems": recommendedCars.length,
          "itemListElement": recommendedCars.slice(0, 10).map((car, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "item": {
              "@type": "Car",
              "name": `${car.brand} ${car.model} (${car.year})`,
              "image": car.images?.[0] || page.ogImage,
              "description": car.description,
              "offers": {
                "@type": "Offer",
                "price": car.price,
                "priceCurrency": "THB",
                "itemCondition": "https://schema.org/UsedCondition",
                "availability": car.isSold ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
              }
            }
          }))
        }
      ]
    };

    return { ...defaultSchema, ...page.jsonLd };
  }
}

export const seoService = new SeoService();
export default seoService;
