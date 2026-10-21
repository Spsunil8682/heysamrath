import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioForm } from "@/components/admin/portfolio-form";
import { ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";

/** Admin pages wait for the server-side login check; they are not meant to render instantly. */
export const instant = false;

export const metadata: Metadata = { title: "Edit portfolio item" };

export default async function EditPortfolioItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("portfolio_items").select("*").eq("id", id).maybeSingle();
  if (error) return <ErrorState title="Item unavailable" />;
  if (!data) notFound();
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Edit: {data.title}</h1>
      <PortfolioForm item={data} />
    </div>
  );
}
