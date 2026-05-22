import { useState, useEffect } from "react";
import { useAppStore } from "../../store";
import { seoService } from "../../services/seo/seoService";
import { SeoLandingPage, SearchRankingInsight, DynamicSeoMeta } from "../../types/seo";

export function useSeo() {
  const { cars } = useAppStore();
  const [pages, setPages] = useState<SeoLandingPage[]>([]);
  const [activePage, setActivePage] = useState<SeoLandingPage | null>(null);
  const [insights, setInsights] = useState<SearchRankingInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customKeyword, setCustomKeyword] = useState("");

  // Load all pages initial
  useEffect(() => {
    const list = seoService.getPrecachedLandingPages();
    setPages(list);
  }, []);

  // Update Insights whenever pages load
  useEffect(() => {
    if (pages.length > 0) {
      seoService.getAiSearchInsights(pages).then((data) => setInsights(data));
    }
  }, [pages]);

  // Dynamic Metadata and HTML tags updater inside the DOM (Next.js Metadata mimicking)
  useEffect(() => {
    if (!activePage) {
      // Revert to main branding title if no active page is chosen
      document.title = "Nong A Luxury & Green Auto Marketplace Room | ตลาดซื้อขายรถบ้านพรีเมียม";
      return;
    }

    const recommendedCars = seoService.recommendCarsForPage(activePage, cars);
    const jsonLdGraph = seoService.compileJsonLd(activePage, recommendedCars);

    // 1. Dynamic document title
    document.title = activePage.title;

    // 2. Head Meta Tag Helper
    const setMetaTag = (attributeName: string, attributeValue: string, contentValue: string) => {
      let meta = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attributeName, attributeValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", contentValue);
    };

    // 3. Set standard and social meta tags
    setMetaTag("name", "description", activePage.description);
    setMetaTag("property", "og:title", activePage.title);
    setMetaTag("property", "og:description", activePage.description);
    setMetaTag("property", "og:image", activePage.ogImage);
    setMetaTag("property", "og:url", activePage.canonicalUrl);
    setMetaTag("property", "og:type", "website");

    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", activePage.title);
    setMetaTag("name", "twitter:description", activePage.description);
    setMetaTag("name", "twitter:image", activePage.ogImage);

    // 4. Handle Canonical Link tag
    let canonicalLink = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", activePage.canonicalUrl);

    // 5. Injects structured JSON-LD script for search engine spiders
    let schemaScript = document.getElementById("nonga-seo-jsonld");
    if (schemaScript) {
      schemaScript.remove();
    }
    schemaScript = document.createElement("script");
    schemaScript.id = "nonga-seo-jsonld";
    schemaScript.setAttribute("type", "application/ld+json");
    schemaScript.innerHTML = JSON.stringify(jsonLdGraph);
    document.head.appendChild(schemaScript);

    return () => {
      // Cleanup injected tags when leaving the SEO dynamic context
      const currentSchema = document.getElementById("nonga-seo-jsonld");
      if (currentSchema) currentSchema.remove();
    };
  }, [activePage, cars]);

  // Create a brand new landing page and inject it to list
  const handleCreateDynamicPage = async (keyword: string) => {
    if (!keyword.trim()) return null;
    setIsLoading(true);
    try {
      const isExist = pages.find(p => p.keyword.toLowerCase() === keyword.toLowerCase().trim());
      if (isExist) {
        setActivePage(isExist);
        setIsLoading(false);
        return isExist;
      }

      const generated = await seoService.generateDynamicSeoPage(keyword);
      setPages(prev => [generated, ...prev]);
      setActivePage(generated);
      setIsLoading(false);
      return generated;
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      return null;
    }
  };

  return {
    pages,
    activePage,
    setActivePage,
    insights,
    isLoading,
    customKeyword,
    setCustomKeyword,
    createDynamicPage: handleCreateDynamicPage,
  };
}
