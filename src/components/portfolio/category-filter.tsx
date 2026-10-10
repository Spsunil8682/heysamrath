import Link from "next/link";
import { portfolioCategories } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";

export function CategoryFilter({ active }: { active: string | null }) {
  const all = [{ value: null, label: "All work" }, ...portfolioCategories];
  return (
    <nav aria-label="Portfolio categories" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2">
        {all.map((c) => {
          const isActive = (c.value ?? null) === active;
          return (
            <li key={c.label}>
              <Link
                href={c.value ? `/portfolio?category=${c.value}` : "/portfolio"}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-full border px-5 text-xs font-medium uppercase tracking-[0.16em] transition-colors",
                  isActive ? "border-gold bg-gold text-ink" : "border-line-strong text-muted hover:border-gold hover:text-paper",
                )}
              >
                {c.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
