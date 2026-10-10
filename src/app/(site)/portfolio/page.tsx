import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryFilter } from "@/components/portfolio/category-filter";
import { PortfolioGallery } from "@/components/portfolio/portfolio-gallery";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState, ErrorState, GridSkeleton, Notice } from "@/components/ui/states";
import { portfolioCategories } from "@/lib/config/site";
import { getPortfolioPage, PORTFOLIO_PAGE_SIZE } from "@/lib/data/public";
import type { PortfolioCategory } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Wedding films, pre-wedding shoots, events, commercial work, reels and photography.",
  alternates: { canonical: "/portfolio" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parse(params: Record<string, string | string[] | undefined>) {
  const raw = typeof params.category === "string" ? params.category : null;
  const category = portfolioCategories.some((c) => c.value === raw) ? (raw as PortfolioCategory) : null;
  const page = Math.min(Math.max(Number.parseInt(String(params.page ?? "1"), 10) || 1, 1), 500);
  return { category, page };
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const { category, page } = parse(await searchParams);
  let result;
  try {
    result = await getPortfolioPage(category, page);
  } catch {
    return <ErrorState title="Portfolio unavailable" />;
  }
  const { items, total, partial } = result;
  const pages = Math.max(1, Math.ceil(total / PORTFOLIO_PAGE_SIZE));
  const href = (p: number) => {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `/portfolio?${s}` : "/portfolio";
  };

  if (items.length === 0) {
    return (
      <EmptyState title="Nothing here yet">
        {category ? "No published projects in this category yet. Try another category." : "Projects will appear here once published."}
      </EmptyState>
    );
  }
  return (
    <>
      {partial && (
        <div className="mb-8">
          <Notice tone="warning">Some projects couldn&apos;t be loaded right now. Showing the rest of our work.</Notice>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        Showing {items.length} of {total} projects
      </p>
      <PortfolioGallery items={items} />
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={href(page - 1)} className={buttonClass("secondary")}>
              Previous
            </Link>
          )}
          <span className="px-3 text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={href(page + 1)} className={buttonClass("secondary")}>
              Load more work
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

async function Filter({ searchParams }: { searchParams: SearchParams }) {
  const { category } = parse(await searchParams);
  return <CategoryFilter active={category} />;
}

export default function PortfolioPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Selected films & photographs"
        intro="Tap any project to watch the film or view the photograph."
      />
      <Container className="py-14 sm:py-20">
        <Suspense fallback={<CategoryFilter active={null} />}>
          <Filter searchParams={searchParams} />
        </Suspense>
        <div className="mt-10">
          <Suspense fallback={<GridSkeleton />}>
            <Results searchParams={searchParams} />
          </Suspense>
        </div>
      </Container>
    </>
  );
}
