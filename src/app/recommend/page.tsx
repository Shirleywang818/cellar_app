import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { RecommendationForm } from "@/components/recommendation-form";

export const dynamic = "force-dynamic";

export default function RecommendPage() {
  return (
    <main className="shell">
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to cellar
      </Link>

      <header className="mb-6 border-b border-border pb-5">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles aria-hidden="true" className="size-4" />
          Recommend
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal">
          Pick a bottle for the moment
        </h1>
      </header>

      <RecommendationForm />
    </main>
  );
}
