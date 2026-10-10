import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-gold">404</p>
        <h1 className="mt-4 font-display text-5xl">This scene was cut</h1>
        <p className="mt-3 text-muted">The page you were looking for doesn&apos;t exist.</p>
        <LinkButton href="/" className="mt-8">
          Back to home
        </LinkButton>
      </div>
    </main>
  );
}
