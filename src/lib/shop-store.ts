"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  MAX_COMPARE,
  MAX_FAVORITES,
  sanitizeSaved,
  toggleInList,
  type ToggleResult,
} from "@/lib/shop-state";

export const SHOP_STORAGE_KEY = "ews-shop";

type ShopState = {
  favorites: string[];
  compare: string[];
  /** False until the saved lists have been read from the browser (avoids a hydration mismatch). */
  hydrated: boolean;
  /** A short message for every visitor-facing action that was refused (never saved). */
  notice: "compare_full" | null;
  showNotice: (notice: "compare_full") => void;
  /** Text for the single screen-reader live region (see ShopToast). */
  announcement: string;
  announce: (text: string) => void;
  clearNotice: () => void;
  toggleFavorite: (id: string) => ToggleResult;
  removeFavorite: (id: string) => void;
  setFavorites: (ids: string[]) => void;
  toggleCompare: (id: string) => ToggleResult;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
};

/** localStorage can be missing or throw (private windows, blocked storage): never crash because of it. */
const safeStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* the lists then only live for this visit */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      favorites: [],
      compare: [],
      hydrated: false,
      notice: null,
      showNotice: (notice) => set({ notice }),
      announcement: "",
      announce: (announcement) => set({ announcement }),
      clearNotice: () => set({ notice: null }),

      toggleFavorite: (id) => {
        const { list, result } = toggleInList(get().favorites, id, MAX_FAVORITES);
        set({ favorites: list });
        return result;
      },
      removeFavorite: (id) => set({ favorites: get().favorites.filter((item) => item !== id) }),
      setFavorites: (ids) => set({ favorites: ids }),

      toggleCompare: (id) => {
        const { list, result } = toggleInList(get().compare, id, MAX_COMPARE);
        set({ compare: list });
        return result;
      },
      removeCompare: (id) => set({ compare: get().compare.filter((item) => item !== id) }),
      clearCompare: () => set({ compare: [] }),
    }),
    {
      name: SHOP_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // Read from storage after the page has hydrated (see ShopHydrator).
      skipHydration: true,
      partialize: ({ favorites, compare }) => ({ favorites, compare }),
      merge: (persisted, current) => ({ ...current, ...sanitizeSaved(persisted) }),
    },
  ),
);
