"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type AppSettings = {
  session_minutes: number;
  multiple_keywords: boolean;
  employee_earnings: boolean;
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const load = useCallback(() => {
    api<AppSettings>("/app-settings")
      .then(setSettings)
      .catch(() =>
        setSettings({
          session_minutes: 5,
          multiple_keywords: false,
          employee_earnings: false,
        })
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, reload: load };
}
