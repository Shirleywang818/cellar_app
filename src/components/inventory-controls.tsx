"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type InventoryControlsProps = {
  wineId: string;
  quantity: number;
};

export function InventoryControls({ wineId, quantity }: InventoryControlsProps) {
  const router = useRouter();
  const [addCount, setAddCount] = useState("1");
  const [adjustment, setAdjustment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitEvent({
    eventType,
    quantityDelta,
    note,
  }: {
    eventType: "purchase" | "adjustment" | "consume";
    quantityDelta: number;
    note?: string;
  }) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/wines/${wineId}/inventory-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          quantity_delta: quantityDelta,
          note,
          source: "manual_edit",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Inventory update failed.");
      }

      setMessage("Inventory updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Inventory update failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const parsedAddCount = Number.parseInt(addCount, 10);
  const parsedAdjustment = Number.parseInt(adjustment, 10);

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Inventory</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current quantity is <span className="font-medium text-foreground">{quantity}</span>.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || quantity <= 0}
          onClick={() =>
            submitEvent({
              eventType: "consume",
              quantityDelta: -1,
              note: "Consumed one bottle",
            })
          }
          title="Consume one bottle"
          type="button"
        >
          <Minus aria-hidden="true" className="size-4" />
          Consume one bottle
        </button>

        {quantity <= 0 ? (
          <p className="text-xs text-muted-foreground">
            This button is disabled because the current quantity is 0.
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Add bottles</span>
          <div className="flex gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
              min="1"
              onChange={(event) => setAddCount(event.target.value)}
              type="number"
              value={addCount}
            />
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting || !Number.isInteger(parsedAddCount) || parsedAddCount <= 0}
              onClick={() =>
                submitEvent({
                  eventType: "purchase",
                  quantityDelta: parsedAddCount,
                  note: "Added bottles",
                })
              }
              title="Add bottles"
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              <span className="sr-only">Add bottles</span>
            </button>
          </div>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Manual adjustment</span>
          <div className="flex gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
              onChange={(event) => setAdjustment(event.target.value)}
              placeholder="-1 or 2"
              type="number"
              value={adjustment}
            />
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                isSubmitting ||
                !Number.isInteger(parsedAdjustment) ||
                parsedAdjustment === 0
              }
              onClick={() =>
                submitEvent({
                  eventType: "adjustment",
                  quantityDelta: parsedAdjustment,
                  note: "Manual count adjustment",
                })
              }
              type="button"
            >
              Set
            </button>
          </div>
        </label>
      </div>

      {message ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
