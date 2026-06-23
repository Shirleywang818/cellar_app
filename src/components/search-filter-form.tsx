import { Search } from "lucide-react";
import { wineTypeSchema } from "@/lib/schemas";

type SearchFilterFormProps = {
  query: string;
  wineType: string;
  stock: string;
};

const WINE_TYPE_OPTIONS = wineTypeSchema.options;

export function SearchFilterForm({
  query,
  wineType,
  stock,
}: SearchFilterFormProps) {
  return (
    <form className="mb-6 grid gap-3 rounded-md border border-border bg-card p-3 shadow-sm md:grid-cols-[1fr_160px_160px_auto]">
      <label className="relative block">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <span className="sr-only">Search wines</span>
        <input
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring transition focus:ring-2"
          defaultValue={query}
          name="q"
          placeholder="Search producer, name, region"
          type="search"
        />
      </label>

      <label>
        <span className="sr-only">Wine type</span>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
          defaultValue={wineType}
          name="type"
        >
          <option value="all">All types</option>
          {WINE_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Stock status</span>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring transition focus:ring-2"
          defaultValue={stock}
          name="stock"
        >
          <option value="all">All stock</option>
          <option value="in_stock">In stock</option>
          <option value="empty">Empty</option>
        </select>
      </label>

      <button
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm"
        type="submit"
      >
        Apply
      </button>
    </form>
  );
}
