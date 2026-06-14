// src/components/scenario/moneyFormat.ts
export function money(
  value: number
) {
  return (
    "₹" +
    Math.round(
      value
    ).toLocaleString()
  );
}