"use client";

import { Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  priceBandSchema,
  wineTypeSchema,
  type PriceBand,
  type WineDetail,
  type WineType,
} from "@/lib/schemas";

type WineEditFormProps = {
  wine: WineDetail;
};

type EditFormState = {
  producer: string;
  name: string;
  vintage: string;
  wine_type: WineType;
  varietals: string;
  region: string;
  country: string;
  alcohol_pct: string;
  cost_per_bottle: string;
  price_band: PriceBand | "";
  currency: string;
  purchase_date: string;
  location: string;
  notes: string;
};

const WINE_TYPE_OPTIONS = wineTypeSchema.options;
const PRICE_BAND_OPTIONS = priceBandSchema.options;

export function WineEditForm({ wine }: WineEditFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<EditFormState>({
    producer: wine.producer,
    name: wine.name,
    vintage: wine.vintage?.toString() ?? "",
    wine_type: wine.wine_type,
    varietals: wine.varietals.join(", "),
    region: wine.region ?? "",
    country: wine.country ?? "",
    alcohol_pct: wine.alcohol_pct?.toString() ?? "",
    cost_per_bottle: wine.cost_per_bottle?.toString() ?? "",
    price_band: wine.price_band ?? "",
    currency: wine.currency,
    purchase_date: wine.purchase_date ?? "",
    location: wine.location ?? "",
    notes: wine.notes ?? "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/wines/${wine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Update failed.");
      }

      setMessage("Saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteWine() {
    const confirmed = window.confirm("Delete this wine from the cellar?");
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/wines/${wine.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Delete failed.");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bottle details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit descriptive fields here. Stock changes live in Inventory.
          </p>
        </div>
        <button
          className="inline-flex size-10 items-center justify-center rounded-md border border-destructive/30 text-destructive disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          onClick={deleteWine}
          title="Delete wine"
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          <span className="sr-only">Delete wine</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Producer"
          onChange={(value) => setField("producer", value)}
          required
          value={form.producer}
        />
        <TextField
          label="Name"
          onChange={(value) => setField("name", value)}
          required
          value={form.name}
        />
        <TextField
          label="Vintage"
          onChange={(value) => setField("vintage", value)}
          type="number"
          value={form.vintage}
        />
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Type</span>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setField("wine_type", event.target.value as WineType)}
            value={form.wine_type}
          >
            {WINE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Varietals"
          onChange={(value) => setField("varietals", value)}
          placeholder="Cabernet Sauvignon, Merlot"
          value={form.varietals}
        />
        <TextField
          label="Region"
          onChange={(value) => setField("region", value)}
          value={form.region}
        />
        <TextField
          label="Country"
          onChange={(value) => setField("country", value)}
          value={form.country}
        />
        <TextField
          label="Alcohol %"
          onChange={(value) => setField("alcohol_pct", value)}
          step="0.1"
          type="number"
          value={form.alcohol_pct}
        />
        <TextField
          label="Cost per bottle"
          onChange={(value) => setField("cost_per_bottle", value)}
          step="0.01"
          type="number"
          value={form.cost_per_bottle}
        />
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Price band</span>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setField("price_band", event.target.value as PriceBand | "")}
            value={form.price_band}
          >
            <option value="">Unknown</option>
            {PRICE_BAND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Currency"
          onChange={(value) => setField("currency", value)}
          value={form.currency}
        />
        <TextField
          label="Purchase date"
          onChange={(value) => setField("purchase_date", value)}
          type="date"
          value={form.purchase_date}
        />
        <TextField
          label="Location"
          onChange={(value) => setField("location", value)}
          value={form.location}
        />
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Notes</span>
          <textarea
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring transition focus:ring-2"
            onChange={(event) => setField("notes", event.target.value)}
            value={form.notes}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          onClick={save}
          type="button"
        >
          <Save aria-hidden="true" className="size-4" />
          Save
        </button>
        {message ? (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TextField({
  label,
  onChange,
  value,
  placeholder,
  required,
  step,
  type = "text",
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

function toPayload(form: EditFormState) {
  return {
    producer: form.producer,
    name: form.name,
    vintage: form.vintage ? Number(form.vintage) : null,
    wine_type: form.wine_type,
    varietals: form.varietals
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    region: form.region,
    country: form.country,
    alcohol_pct: form.alcohol_pct ? Number(form.alcohol_pct) : null,
    cost_per_bottle: form.cost_per_bottle ? Number(form.cost_per_bottle) : null,
    price_band: form.price_band || null,
    currency: form.currency,
    purchase_date: form.purchase_date,
    location: form.location,
    notes: form.notes,
  };
}
