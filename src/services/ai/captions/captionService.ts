import { GeneratedCaption, CarSpecsInput, CaptionType, SocialPlatform, EmojiOption, FavoritedCaption, CaptionTrend } from "../../../types/ai/captions";
import { isUiFixtureBuild, UI_FIXTURE_DISABLED_REASON } from "../../../fixture/uiFixtureMode";

class CaptionService {
  private FAVORITES_KEY = "nonga_favorited_captions";

  /**
   * Request caption generation from the Express API
   */
  async generateCaption(
    specs: CarSpecsInput,
    captionType: CaptionType,
    platform: SocialPlatform,
    emojiOption: EmojiOption,
    trendMultiplier: boolean = false
  ): Promise<GeneratedCaption> {
    if (isUiFixtureBuild) {
      throw new Error(UI_FIXTURE_DISABLED_REASON);
    }
    const response = await fetch("/api/ai/captions/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        specs,
        captionType,
        platform,
        emojiOption,
        trendMultiplier,
      }),
    });

    if (!response.ok) {
      throw new Error(`API failed with status ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to generate caption");
    }

    // Build the final typed object
    const data = result.data;
    return {
      id: `caption_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: data.text,
      hook: data.hook,
      cta: data.cta,
      hashtags: data.hashtags || [],
      score: data.score,
      specsUsed: specs,
      type: captionType,
      platform,
      emojiOption,
      createdAt: new Date().toISOString(),
      isMock: result.isMock,
    };
  }

  /**
   * Request trending search terms and tags for caption multiplier
   */
  async getMarketTrends(): Promise<CaptionTrend[]> {
    try {
      const response = await fetch("/api/ai/captions/trends");
      if (!response.ok) throw new Error();
      const result = await response.json();
      return result.trends || [];
    } catch (e) {
      console.warn("Trend retrieval fallback:", e);
      return [];
    }
  }

  /**
   * Favorites - Save to local storage
   */
  getFavorites(): FavoritedCaption[] {
    const stored = localStorage.getItem(this.FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveFavorite(caption: GeneratedCaption, userNotes?: string): FavoritedCaption[] {
    const favorites = this.getFavorites();
    const isAlreadyFavorited = favorites.some((f) => f.id === caption.id);
    
    if (isAlreadyFavorited) return favorites;

    const newFavorite: FavoritedCaption = {
      ...caption,
      favoriteId: `fav_${Date.now()}`,
      userNotes: userNotes || "",
    };

    const updated = [newFavorite, ...favorites];
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  }

  removeFavorite(favoriteId: string): FavoritedCaption[] {
    const favorites = this.getFavorites();
    const updated = favorites.filter((f) => f.favoriteId !== favoriteId);
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  }

  updateFavoriteNotes(favoriteId: string, notes: string): FavoritedCaption[] {
    const favorites = this.getFavorites();
    const updated = favorites.map((f) => 
      f.favoriteId === favoriteId ? { ...f, userNotes: notes } : f
    );
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(updated));
    return updated;
  }
}

export const captionService = new CaptionService();
