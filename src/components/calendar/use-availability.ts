"use client";

import { useCallback, useEffect, useState } from "react";
import { monthGrid } from "@/lib/booking/calendar";
import type { AvailabilityResponse } from "@/lib/types/availability";

type Loaded = { key: string; data: AvailabilityResponse | null; error: string | null };

/** Loads live availability for the 6-week grid around `month` ("yyyy-MM"). */
export function useAvailability(month: string) {
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState<Loaded>({ key: "", data: null, error: null });
  const [lastData, setLastData] = useState<AvailabilityResponse | null>(null);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const key = `${month}#${nonce}`;

  useEffect(() => {
    const { days } = monthGrid(month);
    const ctrl = new AbortController();
    fetch(`/api/availability?from=${days[0]}&to=${days[days.length - 1]}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) throw new Error(body?.message ?? "Availability could not be loaded.");
        setLoaded({ key, data: body.data as AvailabilityResponse, error: null });
        setLastData(body.data as AvailabilityResponse);
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setLoaded({ key, data: null, error: e instanceof Error ? e.message : "Availability could not be loaded." });
      });
    return () => ctrl.abort();
  }, [month, key]);

  if (loaded.key !== key) return { status: "loading" as const, data: lastData, reload };
  if (loaded.error) return { status: "error" as const, data: lastData, message: loaded.error, reload };
  return { status: "ready" as const, data: loaded.data!, reload };
}
