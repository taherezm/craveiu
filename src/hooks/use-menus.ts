"use client";

import { useState, useEffect, useCallback } from "react";
import type { RawMenuData } from "@/lib/ingestion/adapter";

interface UseMenusReturn {
  menus: RawMenuData[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useMenus(): UseMenusReturn {
  const [menus, setMenus] = useState<RawMenuData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMenus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/menus");
      if (!res.ok) throw new Error(`Failed to fetch menus: ${res.status}`);
      const data: RawMenuData[] = await res.json();
      setMenus(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  return { menus, isLoading, error, lastUpdated, refresh: fetchMenus };
}
