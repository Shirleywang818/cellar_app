"use client";

import { RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell">
      <section className="rounded-md border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-normal">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app could not finish that request. Try again, and if it keeps happening, check the
          latest deployment logs.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">Error id: {error.digest}</p>
        ) : null}
        <button
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
          onClick={reset}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </section>
    </main>
  );
}
