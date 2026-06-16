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