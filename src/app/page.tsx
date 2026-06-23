import { Wine } from "lucide-react";
import { listSeededWines } from "@/lib/cellar";
import { formatPriceBand, formatWineTitle } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const wines = await listSeededWines();

  return (
    <main className="shell">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-sm font-medium text-primary">Hello cellar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            Seeded wines
          </h1>
        </div>
        <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Wine aria-hidden="true" className="size-5" />
        </div>
      </header>

      <section className="grid gap-3">
        {wines.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
            No seeded wines found. Run the migration and seed, then reload.
          </div>
        ) : (
          wines.map((wine) => (
            <article
              className="grid gap-3 rounded-md border border-border bg-card p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"
              key={wine.id}
            >
              <div>
                <h2 className="font-medium">{formatWineTitle(wine)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[wine.wine_type, wine.region, wine.country]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:min-w-48">
                <div>
                  <dt className="text-muted-foreground">Qty</dt>
                  <dd className="font-medium">{wine.quantity}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Band</dt>
                  <dd className="font-medium">{formatPriceBand(wine.price_band)}</dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
