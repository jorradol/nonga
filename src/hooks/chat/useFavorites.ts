import { useState, useEffect, useCallback } from "react";

const FAVORITES_LOCAL_KEY = "nonga_saved_favorite_messages";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_LOCAL_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not read saved favorite messages", e);
    }
  }, []);

  const toggleFavorite = useCallback((messageId: string) => {
    setFavorites((prev) => {
      const isFav = prev.includes(messageId);
      const next = isFav ? prev.filter((id) => id !== messageId) : [...prev, messageId];
      try {
        localStorage.setItem(FAVORITES_LOCAL_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Could not save favorite messages", e);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((messageId: string) => {
    return favorites.includes(messageId);
  }, [favorites]);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
}
