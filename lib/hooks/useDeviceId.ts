"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "gtbs_device_id";

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let id: string;
    try {
      id = window.localStorage.getItem(STORAGE_KEY) ?? "";
      if (!id) {
        id = crypto.randomUUID();
        window.localStorage.setItem(STORAGE_KEY, id);
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back to an
      // in-memory id for this session only.
      id = crypto.randomUUID();
    }
    queueMicrotask(() => setDeviceId(id));
  }, []);

  return deviceId;
}
