import { Heart, Sparkles, Wine } from "lucide-react";
import Link from "next/link";
import { SearchFilterForm } from "@/components/search-filter-form";
import { listWines } from "@/lib/cellar";
import { formatPriceBand, formatWineTitle } from "@/lib/format";
import { wineTypeSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    stock?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const parsedType = wineTypeSchema.safeParse(params.type);
  const selectedType = parsedType.success ? parsedType.data : "all";
  const selectedStock =
    params.stock === "in_stock" || params.stock === "empty" ? params.stock : "all";
  const query = params.q?.trim() ?? "";
  const wines = await listWines({
    query,
    wineType: selectedType,
    stock: selectedStock,
  });

  return (
    <main className="shell">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-sm font-medium text-primary">Hello cellar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            Cellar wines
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm"
            href="/preferences"
          >
            <Heart aria-hidden="true" className="size-4" />
            Preferences
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm"
            href="/recommend"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Recommend
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm"
            href="/add"
          >
            <Wine aria-hidden="true" className="size-4" />
            Add
          </Link>
        </div>
      </header>

      <SearchFilterForm
        query={query}
        stock={selectedStock}
        wineType={selectedType}
      />

      <section className="grid gap-3">
        {wines.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
            No wines found. Add a bottle to start your cellar.
          </div>
        ) : (
          wines.map((wine) => (
            <Link
              className="grid gap-3 rounded-md border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:grid-cols-[72px_1fr_auto] sm:items-center"
              href={`/wines/${wine.id}`}
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
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
