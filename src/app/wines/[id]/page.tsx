import { ArrowLeft, Wine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InventoryControls } from "@/components/inventory-controls";
import { WineEditForm } from "@/components/wine-edit-form";
import { getWine } from "@/lib/cellar";
import { formatPriceBand, formatWineTitle } from "@/lib/format";

export const dynamic = "force-dynamic";

type WinePageProps = {
  params: Promise<{ id: string }>;
};

export default async function WinePage({ params }: WinePageProps) {
  const { id } = await params;
  const wine = await getWine(id);

  if (!wine) {
    notFound();
  }

  return (
    <main className="shell">
      <Link
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        href="/"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to cellar
      </Link>

      <header className="mb-6 grid gap-4 border-b border-border pb-5 md:grid-cols-[120px_1fr_auto] md:items-center">
        <div className="flex size-[120px] items-center justify-center overflow-hidden rounded-md bg-muted">
          {wine.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`${formatWineTitle(wine)} label`}
              className="h-full w-full object-cover"
              src={wine.photo_url}
            />
          ) : (
            <Wine aria-hidden="true" className="size-8 text-muted-foreground" />
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-primary">{wine.wine_type}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            {formatWineTitle(wine)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {[wine.region, wine.country].filter(Boolean).join(" · ") || "No region set"}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card p-4 text-sm md:min-w-56">
          <div>
            <dt className="text-muted-foreground">Qty</dt>
            <dd className="mt-1 text-xl font-semibold">{wine.quantity}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Band</dt>
            <dd className="mt-1 font-semibold">{formatPriceBand(wine.price_band)}</dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        <WineEditForm wine={wine} />

        <div className="grid gap-4">
          <InventoryControls quantity={wine.quantity} wineId={wine.id} />
          <section className="rounded-md border border-border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">History</h2>
            {wine.inventory_events.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No inventory events yet.
              </p>
            ) : (
              <ol className="mt-3 grid gap-2">
                {wine.inventory_events.map((event) => (
                  <li
                    className="rounded-md border border-border bg-background p-3 text-sm"
                    key={event.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{event.event_type}</span>
                      <span
                        className={
                          event.quantity_delta > 0 ? "text-primary" : "text-destructive"
                        }
                      >
                        {event.quantity_delta > 0 ? "+" : ""}
                        {event.quantity_delta}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {new Date(event.created_at).toLocaleDateString()}
                      {event.source ? ` · ${event.source}` : ""}
                    </p>
                    {event.note ? (
                      <p className="mt-1 text-muted-foreground">{event.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
