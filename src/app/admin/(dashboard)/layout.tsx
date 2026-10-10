import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/admin/_actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Spinner } from "@/components/ui/states";
import { requireAdmin } from "@/lib/auth/admin";

export const instant = false;

/** Verifies the session server-side before any admin page renders. Pages verify again for their data. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}

async function SignedInAs() {
  const admin = await requireAdmin();
  return <p className="truncate text-xs text-subtle" title={admin.email ?? undefined}>{admin.email}</p>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-line bg-charcoal p-4 lg:border-r lg:border-b-0 lg:p-6">
        <div className="flex items-center justify-between lg:block">
          <Link href="/admin" className="font-display text-2xl">
            Studio admin
          </Link>
          <div className="lg:mt-2">
            <Suspense fallback={null}>
              <SignedInAs />
            </Suspense>
          </div>
        </div>
        <div className="mt-4 lg:mt-10">
          <AdminNav />
        </div>
        <div className="mt-4 flex gap-2 lg:mt-10 lg:flex-col">
          <Link href="/" target="_blank" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-paper">
            <ExternalLink className="size-4" aria-hidden /> View site
          </Link>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-paper">
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 p-4 sm:p-8 lg:p-10">
        <Suspense
          fallback={
            <div className="py-20 text-center">
              <Spinner label="Loading admin" />
            </div>
          }
        >
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </main>
    </div>
  );
}
