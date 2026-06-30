import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <section className="rounded-md border border-border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-normal">Not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That page or wine record is not available.
        </p>
        <Link
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
          href="/"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to cellar
        </Link>
      </section>
    </main>
  );
}
