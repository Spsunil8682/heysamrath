import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export const inputClass =
  "block w-full rounded-lg border border-line-strong bg-panel px-4 py-3 text-sm text-paper placeholder:text-subtle transition-colors focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold aria-[invalid=true]:border-danger";

export function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
        {required && (
          <span className="text-gold" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: unknown) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-32 resize-y", className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "appearance-none bg-panel pr-10", className)} {...props} />;
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm text-muted", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--color-gold)]" {...props} />
      <span>{label}</span>
    </label>
  );
}
