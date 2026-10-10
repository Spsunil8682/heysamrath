"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ActionState } from "@/lib/admin/action-state";
import { cn } from "@/lib/utils/cn";

/**
 * Runs a server action, optionally behind a confirmation dialog, and reports the outcome.
 * Authorization is enforced inside the action itself, not by this button.
 */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "secondary",
  size = "sm",
  className,
  ariaLabel,
}: {
  action: () => Promise<ActionState>;
  children: ReactNode;
  confirm?: { title: string; body: ReactNode; confirmLabel: string; danger?: boolean };
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);

  const run = () =>
    start(async () => {
      const r = await action();
      setResult(r);
      if (r.ok) setOpen(false);
    });

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        aria-label={ariaLabel}
        onClick={() => (confirm ? (setResult(null), setOpen(true)) : run())}
      >
        {pending && !confirm ? "Working…" : children}
      </Button>
      {!open && result?.message && (
        <span role="status" className={cn("text-xs", result.ok ? "text-success" : "text-danger")}>
          {result.message}
        </span>
      )}
      {confirm && (
        <Dialog open={open} onClose={() => !pending && setOpen(false)} title={confirm.title}>
          <div className="space-y-5 px-6 pt-3 pb-6">
            <div className="text-sm text-muted">{confirm.body}</div>
            {result && !result.ok && (
              <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm">
                {result.message}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Keep as is
              </Button>
              <Button variant={confirm.danger ? "danger" : "primary"} onClick={run} disabled={pending}>
                {pending ? "Working…" : confirm.confirmLabel}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </span>
  );
}
