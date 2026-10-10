"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-8">
      {navigation.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "text-xs font-medium uppercase tracking-[0.2em] transition-colors",
                active ? "text-gold" : "text-paper/80 hover:text-paper",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
