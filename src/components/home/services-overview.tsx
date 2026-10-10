import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { services } from "@/lib/config/services";

export function ServicesOverview() {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {services.map((s, i) => (
        <li key={s.slug}>
          <Link
            href={`/services#${s.slug}`}
            className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 py-7 transition-colors hover:bg-white/[0.02] sm:gap-10"
          >
            <span className="font-display text-lg text-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <span className="block font-display text-2xl transition-colors group-hover:text-gold-bright sm:text-3xl">{s.name}</span>
              <span className="mt-1 block text-sm text-muted">{s.summary}</span>
            </span>
            <ArrowUpRight className="size-6 text-subtle transition-all group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-gold" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
