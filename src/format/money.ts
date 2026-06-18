export function money(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
}

export function moneyCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 10_000_000)
    return `${sign}₹${(abs / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export function moneySigned(value: number): string {
  const sign = value >= 0 ? "+" : "−";
  const abs = Math.abs(value);
  return `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
}
