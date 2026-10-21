import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { ErrorState } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";

/** Admin pages wait for the server-side login check; they are not meant to render instantly. */
export const instant = false;

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("business_settings").select("*").eq("id", 1).single();
  if (error || !data) return <ErrorState title="Settings unavailable" />;
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">Business settings</h1>
      <SettingsForm settings={data} />
    </div>
  );
}
