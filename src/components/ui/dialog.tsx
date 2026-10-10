"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Accessible modal built on the native <dialog> element: focus is trapped and restored by the browser,
 * Escape closes it, and the rest of the page becomes inert.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  hideTitle = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on backdrop
      }}
      className={cn(
        "m-auto max-h-[92dvh] w-[min(100%-2rem,40rem)] overflow-auto rounded-2xl border border-line bg-charcoal p-0 text-paper shadow-2xl",
        className,
      )}
    >
      {open && (
        <div className="relative">
          <div className={cn("flex items-start justify-between gap-4 px-6 pt-5", hideTitle && "absolute inset-x-0 top-0 z-10")}>
            <h2 className={cn("font-display text-2xl", hideTitle && "sr-only")}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-full bg-black/50 p-2 text-paper transition-colors hover:bg-black/80"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
