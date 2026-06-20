export function formatMonth(
  month: string
) {
  const [year, monthNum] =
    month.split("-");

  return new Date(
    Number(year),
    Number(monthNum) - 1
  ).toLocaleString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );
}

// Group heading form, e.g. "April, 2026" (with a comma).
export function formatMonthGrouped(month: string) {
  const [year, monthNum] = month.split("-");
  const name = new Date(Number(year), Number(monthNum) - 1).toLocaleString("en-US", {
    month: "long",
  });
  return `${name}, ${year}`;
}