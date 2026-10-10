"use client";

import type { ActionState } from "@/lib/admin/action-state";
import { Notice } from "@/components/ui/states";

export function FormStatus({ state }: { state: ActionState }) {
  if (!state.message && !state.warnings?.length) return null;
  return (
    <div className="space-y-2" role={state.ok ? "status" : "alert"}>
      {state.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
      {state.warnings?.map((w) => (
        <Notice key={w} tone="warning">
          {w}
        </Notice>
      ))}
    </div>
  );
}
