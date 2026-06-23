"use client";

import { ArrowLeft, Camera, Save, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  type InputHTMLAttributes,
  useMemo,
  useState,
} from "react";
import type { ExtractionOutput } from "@/lib/schemas";

type FormState = {
  producer: string;
  name: string;
  vintage: string;
  wine_type: string;
  varietals: string;
  region: string;
  country: string;
  alcohol_pct: string;
  quantity: string;
  cost_per_bottle: string;
  price_band: string;
  currency: string;
  purchase_date: string;
  location: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  producer: "",
  name: "",
  vintage: "",
  wine_type: "red",
  varietals: "",
  region: "",
  country: "",
  alcohol_pct: "",
  quantity: "1",
  cost_per_bottle: "",
  price_band: "",
  currency: "USD",
  purchase_date: "",
  location: "",
  notes: "",
};

const WINE_TYPES = [
  ["red", "Red"],
  ["white", "White"],
  ["rose", "Rose"],
  ["sparkling", "Sparkling"],
  ["dessert", "Dessert"],
  ["fortified", "Fortified"],
] as const;

const PRICE_BANDS = [
  ["", "Unknown"],
  ["under_100", "$100 or less"],
  ["101_200", "$101-$200"],
  ["201_300", "$201-$300"],
  ["301_500", "$301-$500"],
  ["500_plus", "$500+"],
] as const;

const LOW_CONFIDENCE_THRESHOLD = 0.72;

export function AddWineForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [extractionMeta, setExtractionMeta] = useState<Record<string, unknown> | null>(null);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasCost = form.cost_per_bottle.trim().length > 0;

  const lowConfidenceFields = useMemo(
    () =>
      new Set(
        Object.entries(confidence)
          .filter(([, value]) => value < LOW_CONFIDENCE_THRESHOLD)
          .map(([key]) => key),
      ),
    [confidence],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPhotoPath(null);
    setExtractionMeta(null);
    setConfidence({});
    setMessage(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleExtract() {
    if (!selectedFile) {
      setMessage("Choose a label photo first.");
      return;
    }

    setIsExtracting(true);
    setMessage(null);

    try {
      const image = await downscaleImage(selectedFile);
      const body = new FormData();
      body.append("image", image);

      const response = await fetch("/api/wines/extract", {
        method: "POST",
        body,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Extraction failed.");
      }

      applyExtraction(payload.fields);
      setPhotoPath(payload.photo_path);
      setExtractionMeta(payload.extraction_meta ?? null);
      setConfidence(payload.fields?.confidence ?? {});
      setMessage(
        payload.fallback
          ? "Could not read the label. Enter details manually."
          : "Label read. Review before saving.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not read the label. Enter details manually.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/wines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form, photoPath, extractionMeta)),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Save failed.");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  function applyExtraction(fields: ExtractionOutput) {
    setForm((current) => ({
      ...current,
      producer: fields.producer ?? current.producer,
      name: fields.name ?? current.name,
      vintage: fields.vintage ? String(fields.vintage) : current.vintage,
      wine_type: fields.wine_type ?? current.wine_type,
      varietals:
        fields.varietals.length > 0 ? fields.varietals.join(", ") : current.varietals,
      region: fields.region ?? current.region,
      country: fields.country ?? current.country,
      alcohol_pct:
        fields.alcohol_pct != null ? String(fields.alcohol_pct) : current.alcohol_pct,
    }));
  }

  function setField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <header className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <Link
            className="inline-flex items-center gap-1 text-sm text-muted-foreground"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Cellar
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">Add Wine</h1>
        </div>
      </header>

      <section className="grid gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-muted">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Selected wine label"
                className="h-full w-full object-cover"
                src={previewUrl}
              />
            ) : (
              <Camera aria-hidden="true" className="size-8 text-muted-foreground" />
            )}
          </div>

          <div className="flex flex-col justify-center gap-3">
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium">
              <Upload aria-hidden="true" className="size-4" />
              Select Label
              <input
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleFileChange}
                type="file"
              />
            </label>
            <button
              className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedFile || isExtracting}
              onClick={handleExtract}
              type="button"
            >
              <Camera aria-hidden="true" className="size-4" />
              {isExtracting ? "Reading" : "Read Label"}
            </button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </div>
      </section>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <section className="grid gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Producer"
              lowConfidence={lowConfidenceFields.has("producer")}
              onChange={(value) => setField("producer", value)}
              required
              value={form.producer}
            />
            <TextField
              label="Name"
              lowConfidence={lowConfidenceFields.has("name")}
              onChange={(value) => setField("name", value)}
              required
              value={form.name}
            />
            <TextField
              label="Vintage"
              lowConfidence={lowConfidenceFields.has("vintage")}
              onChange={(value) => setField("vintage", value)}
              placeholder="Blank for NV"
              type="number"
              value={form.vintage}
            />
            <SelectField
              label="Type"
              onChange={(value) => setField("wine_type", value)}
              options={WINE_TYPES}
              value={form.wine_type}
            />
            <TextField
              label="Varietals"
              lowConfidence={lowConfidenceFields.has("varietals")}
              onChange={(value) => setField("varietals", value)}
              placeholder="Cabernet Sauvignon, Merlot"
              value={form.varietals}
            />
            <TextField
              label="Alcohol %"
              lowConfidence={lowConfidenceFields.has("alcohol_pct")}
              onChange={(value) => setField("alcohol_pct", value)}
              step="0.1"
              type="number"
              value={form.alcohol_pct}
            />
            <TextField
              label="Region"
              lowConfidence={lowConfidenceFields.has("region")}
              onChange={(value) => setField("region", value)}
              value={form.region}
            />
            <TextField
              label="Country"
              lowConfidence={lowConfidenceFields.has("country")}
              onChange={(value) => setField("country", value)}
              value={form.country}
            />
          </div>
        </section>

        <section className="grid gap-4 rounded-md border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Quantity"
              min="0"
              onChange={(value) => setField("quantity", value)}
              required
              type="number"
              value={form.quantity}
            />
            <TextField
              label="Cost"
              min="0"
              onChange={(value) => setField("cost_per_bottle", value)}
              step="0.01"
              type="number"
              value={form.cost_per_bottle}
            />
            <SelectField
              disabled={hasCost}
              label="Price Band"
              onChange={(value) => setField("price_band", value)}
              options={PRICE_BANDS}
              value={hasCost ? "" : form.price_band}
            />
            <TextField
              label="Purchase Date"
              onChange={(value) => setField("purchase_date", value)}
              type="date"
              value={form.purchase_date}
            />
            <TextField
              label="Location"
              onChange={(value) => setField("location", value)}
              value={form.location}
            />
            <TextField
              label="Currency"
              onChange={(value) => setField("currency", value)}
              required
              value={form.currency}
            />
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Notes
            <textarea
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              onChange={(event) => setField("notes", event.target.value)}
              value={form.notes}
            />
          </label>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            href="/"
          >
            Cancel
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSaving ? "Saving" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  lowConfidence = false,
  onChange,
  value,
  ...props
}: {
  label: string;
  lowConfidence?: boolean;
  onChange: (value: string) => void;
  value: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span className="flex items-center gap-2">
        {label}
        {lowConfidence ? (
          <span className="rounded-sm bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
            Check
          </span>
        ) : null}
      </span>
      <input
        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
        onChange={(event) => onChange(event.target.value)}
        value={value}
        {...props}
      />
    </label>
  );
}

function SelectField({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <select
        className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2 disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function toPayload(
  form: FormState,
  photoPath: string | null,
  extractionMeta: Record<string, unknown> | null,
) {
  return {
    producer: form.producer,
    name: form.name,
    vintage: numberOrNull(form.vintage),
    wine_type: form.wine_type,
    varietals: form.varietals
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    region: form.region,
    country: form.country,
    alcohol_pct: numberOrNull(form.alcohol_pct),
    quantity: Number.parseInt(form.quantity, 10) || 1,
    cost_per_bottle: numberOrNull(form.cost_per_bottle),
    price_band: form.cost_per_bottle ? null : form.price_band || null,
    currency: form.currency,
    purchase_date: form.purchase_date,
    location: form.location,
    notes: form.notes,
    photo_path: photoPath,
    extraction_meta: extractionMeta,
  };
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function downscaleImage(file: File) {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size <= 2_500_000) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");

    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.86);
    });

    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}
