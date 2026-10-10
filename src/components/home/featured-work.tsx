import { connection } from "next/server";
import { PortfolioGallery } from "@/components/portfolio/portfolio-gallery";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { getFeaturedPortfolio } from "@/lib/data/public";
import type { PortfolioDisplayItem } from "@/lib/types/database";

const isSocial = (i: PortfolioDisplayItem) => Boolean(i.social_url || i.views_label);

/** Featured work, minus the reels shown in the Instagram spotlight above it. */
export async function FeaturedWork() {
  await connection();
  let items;
  try {
    ({ items } = await getFeaturedPortfolio(12));
  } catch {
    return <ErrorState title="Portfolio unavailable" />;
  }
  const rest = items.filter((i) => !isSocial(i)).slice(0, 5);
  if (rest.length === 0) {
    return <EmptyState title="New work coming soon">Featured projects will appear here once they are published.</EmptyState>;
  }
  return <PortfolioGallery items={rest} layout={rest.length === 5 ? "feature" : "grid"} />;
}

/** Featured videos that have an Instagram link or view count. Renders nothing when there are none. */
export async function InstagramSpotlight({ heading }: { heading: React.ReactNode }) {
  await connection();
  let items;
  try {
    ({ items } = await getFeaturedPortfolio(12));
  } catch {
    return null;
  }
  const social = items.filter(isSocial).slice(0, 4);
  if (social.length === 0) return null;
  return (
    <section className="border-b border-line bg-charcoal py-20 sm:py-28" aria-labelledby="spotlight-title">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {heading}
        <div className="mt-12">
          <PortfolioGallery items={social} columns={2} />
        </div>
      </div>
    </section>
  );
}
