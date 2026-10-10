"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { navigation } from "@/lib/config/site";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Portal target only exists in the browser; the header's backdrop-filter would otherwise trap `position: fixed`.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    // Move keyboard focus into the (portalled) menu, and restore it when the menu closes.
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      toggle?.focus();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="relative z-50 rounded-full p-2 text-paper hover:bg-white/10"
      >
        {open ? (
          <X className="size-6" aria-hidden />
        ) : (
          <Menu className="size-6" aria-hidden />
        )}
      </button>
      {mounted &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            hidden={!open}
            className="fixed inset-0 z-40 overflow-y-auto bg-ink px-6 pt-28 pb-10 md:hidden"
          >
            <nav aria-label="Mobile">
              <ul className="space-y-1">
                {[{ href: "/", label: "Home" }, ...navigation].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={cn(
                        "block border-b border-line py-4 font-display text-3xl",
                        pathname === item.href ? "text-gold" : "text-paper",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/booking"
                onClick={() => setOpen(false)}
                className={buttonClass("primary", "lg", "mt-10 w-full")}
              >
                Book a Session
              </Link>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
