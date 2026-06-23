import type { PriceBand } from "@/lib/schemas";

export function derivePriceBand(cost: number | null | undefined): PriceBand | null {
  if (cost == null) return null;
  if (cost <= 100) return "under_100";
  if (cost <= 200) return "101_200";
  if (cost <= 300) return "201_300";
  if (cost <= 500) return "301_500";
  return "500_plus";
}
