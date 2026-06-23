import type { PriceBand, WineListItem } from "@/lib/schemas";

const PRICE_BAND_LABELS: Record<PriceBand, string> = {
  under_100: "$100 or less",
  "101_200": "$101-$200",
  "201_300": "$201-$300",
  "301_500": "$301-$500",
  "500_plus": "$500+",
};

export function formatPriceBand(priceBand: PriceBand | null) {
  return priceBand ? PRICE_BAND_LABELS[priceBand] : "Unknown";
}

export function formatWineTitle(wine: Pick<WineListItem, "producer" | "name" | "vintage">) {
  const vintage = wine.vintage ? `${wine.vintage} ` : "";
  return `${vintage}${wine.producer} ${wine.name}`.trim();
}
