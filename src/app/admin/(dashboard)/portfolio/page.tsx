import type { Metadata } from "next";
import Link from "next/link";
import { deletePortfolioItem, movePortfolioItem, togglePortfolioFlag } from "@/app/admin/_actions/portfolio";
import { ActionButton } from "@/components/admin/action-button";
import { MediaImage } from "@/components/portfolio/media-image";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";
import { categoryLabel } from "@/lib/config/site";
import { localLibrary } from "@/lib/data/local-media";
import { tileImageUrl } from "@/lib/media";

/** Admin pages wait for the server-side login check; they are not meant to render instantly. */
export const instant = false;

export const metadata: Metadata = { title: "Portfolio" };

export default async function AdminPortfolioPage() {
  const { supabase } = await requireAdmin();
  const { data: items, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("display_order")
    .order("created_at", { ascending: false });
  if (error) return <ErrorState title="Portfolio unavailable" />;
  const library = localLibrary();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Portfolio</h1>
          <p className="mt-1 text-sm text-muted">{items.length} items · {items.filter((i) => i.published).length} published</p>
        </div>
        <LinkButton href="/admin/portfolio/new">Add item</LinkButton>
      </header>
      {items.length === 0 ? (
        <EmptyState title="No portfolio items yet">Add your first photo or video.</EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {items.map((item, i) => (
            <li key={item.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-panel">
                <MediaImage src={tileImageUrl(item)} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/portfolio/${item.id}`} className="font-medium hover:text-gold-bright">
                  {item.title}
                </Link>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge>{categoryLabel(item.category)}</Badge>
                  <Badge>{item.media_type}</Badge>
                  {item.published ? <Badge className="border-success/40 text-success">Published</Badge> : <Badge>Draft</Badge>}
                  {item.featured && <Badge className="border-gold/50 text-gold">Featured</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton variant="ghost" ariaLabel="Move up" action={movePortfolioItem.bind(null, item.id, "up")} className={i === 0 ? "invisible" : ""}>↑</ActionButton>
                <ActionButton variant="ghost" ariaLabel="Move down" action={movePortfolioItem.bind(null, item.id, "down")} className={i === items.length - 1 ? "invisible" : ""}>↓</ActionButton>
                <ActionButton action={togglePortfolioFlag.bind(null, item.id, "published", !item.published)}>
                  {item.published ? "Unpublish" : "Publish"}
                </ActionButton>
                <ActionButton action={togglePortfolioFlag.bind(null, item.id, "featured", !item.featured)}>
                  {item.featured ? "Unfeature" : "Feature"}
                </ActionButton>
                <LinkButton href={`/admin/portfolio/${item.id}`} variant="secondary" size="sm">Edit</LinkButton>
                <ActionButton
                  variant="danger"
                  action={deletePortfolioItem.bind(null, item.id)}
                  confirm={{
                    title: `Delete “${item.title}”?`,
                    body: "This removes the entry from the website. The media file itself is not deleted.",
                    confirmLabel: "Delete",
                    danger: true,
                  }}
                >
                  Delete
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <section className="space-y-4 rounded-2xl border border-line bg-panel p-6" aria-labelledby="local-library">
        <div>
          <h2 id="local-library" className="font-display text-2xl">Local video library ({library.length})</h2>
          <p className="mt-1 text-sm text-muted">
            Videos imported from your footage folder with <code>npm run media:import</code>. They ship with the website
            and appear in the portfolio automatically. Edit titles, categories and the featured / published / hero flags
            in <code>src/lib/config/local-media.json</code>, then redeploy. A database entry above that uses the same
            video URL replaces the local one.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {library.map((v) => (
            <li key={v.slug} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-charcoal">
                <MediaImage src={v.poster} alt="" fill sizes="56px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm">{v.title}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge>{categoryLabel(v.category)}</Badge>
                  {v.published === false ? <Badge>Hidden</Badge> : <Badge className="border-success/40 text-success">Live</Badge>}
                  {v.featured && <Badge className="border-gold/50 text-gold">Featured</Badge>}
                  {v.hero !== false && <Badge>Hero</Badge>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
