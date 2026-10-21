import type { Metadata } from "next";
import { ServiceForm } from "@/components/admin/service-form";
import { requireAdmin } from "@/lib/auth/admin";

/** Admin pages wait for the server-side login check; they are not meant to render instantly. */
export const instant = false;

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("business_settings").select("currency").eq("id", 1).maybeSingle();
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">New service</h1>
      <ServiceForm defaultCurrency={data?.currency ?? "INR"} />
    </div>
  );
}
