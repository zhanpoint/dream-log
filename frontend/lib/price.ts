export function formatCnyMonthly(
  price: number | undefined,
  options?: { freeLabel?: string; perMonthLabel?: string; locale?: string }
) {
  if (price === undefined) return "";

  const freeLabel = options?.freeLabel ?? "Free";
  const perMonthLabel = options?.perMonthLabel ?? "/mo";
  const locale = options?.locale ?? "en";

  if (price === 0) return freeLabel;

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

  return `¥${formatted}${perMonthLabel}`;
}

