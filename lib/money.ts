import type { Money } from "@/lib/shopify";

export function formatMoney({ amount, currencyCode }: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(Number(amount));
}
