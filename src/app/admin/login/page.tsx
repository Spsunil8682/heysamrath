import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-gold">
          ← Back to site
        </Link>
        <h1 className="mt-6 font-display text-4xl">Studio admin</h1>
        <p className="mt-2 text-sm text-muted">Sign in with your administrator account.</p>
        <div className="mt-8 rounded-2xl border border-line bg-panel p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
