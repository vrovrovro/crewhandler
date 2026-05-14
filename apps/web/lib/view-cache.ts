"use client";

interface CacheEntry<T> {
  data: T;
  savedAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export const readViewCache = <T>(key: string, maxAgeMs = 60_000): T | null => {
  const memoryValue = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memoryValue && Date.now() - memoryValue.savedAt < maxAgeMs) {
    return memoryValue.data;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(`view-cache:${key}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.savedAt >= maxAgeMs) {
      window.sessionStorage.removeItem(`view-cache:${key}`);
      return null;
    }
    memoryCache.set(key, parsed as CacheEntry<unknown>);
    return parsed.data;
  } catch {
    window.sessionStorage.removeItem(`view-cache:${key}`);
    return null;
  }
};

export const writeViewCache = <T>(key: string, data: T) => {
  const entry: CacheEntry<T> = { data, savedAt: Date.now() };
  memoryCache.set(key, entry as CacheEntry<unknown>);

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(`view-cache:${key}`, JSON.stringify(entry));
  }
};

export const clearViewCache = () => {
  memoryCache.clear();

  if (typeof window !== "undefined") {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith("view-cache:"))
      .forEach((key) => window.sessionStorage.removeItem(key));
  }
};
