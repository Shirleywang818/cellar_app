"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TastingFormProps = {
  wineId: string;
};

export function TastingForm({ wineId }: TastingFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [pairedWith, setPairedWith] = useState("");
  const [tastedOn, setTastedOn] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function save() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wine_id: wineId,
          rating: rating ? Number(rating) : null,
          notes,
          paired_with: pairedWith,
          tasted_on: tastedOn,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save tasting.");
      }

      setRating("");
      setNotes("");
      setPairedWith("");
      setMessage(
        payload.profile_updated
          ? "Tasting saved and preferences updated."
          : "Tasting saved. Preference update will try again later.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save tasting.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Log tasting</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This records palate memory only. It will not change inventory quantity.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Rating</span>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setRating(event.target.value)}
            value={rating}
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Notes</span>
          <textarea
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What stood out?"
            value={notes}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Paired with</span>
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setPairedWith(event.target.value)}
            placeholder="Optional"
            value={pairedWith}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">Date</span>
          <input
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setTastedOn(event.target.value)}
            type="date"
            value={tastedOn}
          />
        </label>

        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting || (!rating && !notes.trim())}
          onClick={save}
          type="button"
        >
          <Star aria-hidden="true" className="size-4" />
          Save tasting
        </button>
      </div>

      {message ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
