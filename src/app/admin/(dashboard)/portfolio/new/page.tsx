import type { Metadata } from "next";
import { PortfolioForm } from "@/components/admin/portfolio-form";
import { requireAdmin } from "@/lib/auth/admin";

/** Admin pages wait for the server-side login check; they are not meant to render instantly. */
export const instant = false;

export const metadata: Metadata = { title: "New portfolio item" };

export default async function NewPortfolioItemPage() {
  await requireAdmin();
  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">New portfolio item</h1>
      <PortfolioForm />
    </div>
  );
}
