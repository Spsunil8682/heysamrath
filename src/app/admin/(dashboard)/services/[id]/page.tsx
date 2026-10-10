import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/admin/service-form";
import { ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
  if (error) return <ErrorState title="Service unavailable" />;
  if (!data) notFound();
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Edit: {data.name}</h1>
      <ServiceForm service={data} defaultCurrency={data.currency} />
    </div>
  );
}
