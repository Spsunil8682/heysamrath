"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? error.name);
  }, [error]);
  const setup = error.name === "SetupError" || error.message.includes("environment variable");
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-5 text-center">
      <div className="max-w-lg">
        <h1 className="font-display text-4xl">{setup ? "Setup required" : "Something went wrong"}</h1>
        <p className="mt-3 text-muted">
          {setup
            ? "The site is not connected to its database yet. Check the environment variables described in the README."
            : "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <LinkButton href="/" variant="secondary">
            Home
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
