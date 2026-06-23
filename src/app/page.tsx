import { Wine } from "lucide-react";
import { listWines } from "@/lib/cellar";
import { formatPriceBand, formatWineTitle } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const wines = await listWines();

  return (
    <main className="shell">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-sm font-medium text-primary">Hello cellar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            Cellar wines
          </h1>
        </div>
        <a
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm"
          href="/add"
        >
          <Wine aria-hidden="true" className="size-4" />
          Add
        </a>
      </header>

      <section className="grid gap-3">
        {wines.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
            No wines found. Add a bottle to start your cellar.
          </div>
        ) : (
          wines.map((wine) => (
            <article
              className="grid gap-3 rounded-md border border-border bg-card p-4 shadow-sm sm:grid-cols-[72px_1fr_auto] sm:items-center"
              key={wine.id}
            >
              <div className="flex size-[72px] items-center justify-center overflow-hidden rounded-md bg-muted">
                {wine.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`${formatWineTitle(wine)} label`}
                    className="h-full w-full object-cover"
                    src={wine.photo_url}
                  />
                ) : (
                  <Wine aria-hidden="true" className="size-6 text-muted-foreground" />
                )}
              </div>
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
