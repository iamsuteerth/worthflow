export function money(value: number): string {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

export function sumEvents<T extends { type: string; amount: number }>(
  events: T[],
  type: string
): number {
  return events
    .filter((e) => e.type === type)
    .reduce((sum, e) => sum + e.amount, 0);
}

const INSTRUMENT_OUTFLOW_TYPES = new Set(["FD_CREATED", "RD_CREATED"]);
const INSTRUMENT_INFLOW_TYPES = new Set(["FD_MATURED", "RD_MATURED"]);
const ALL_INSTRUMENT_TYPES = new Set([
  ...INSTRUMENT_OUTFLOW_TYPES,
  ...INSTRUMENT_INFLOW_TYPES,
]);

export function netInstrumentFlow<T extends { type: string; amount: number }>(
  events: T[]
): number {
  return events
    .filter((e) => {
      const known = ALL_INSTRUMENT_TYPES.has(e.type);
      if (!known && e.type.includes("FD") || e.type.includes("RD")) {
        console.warn(`netInstrumentFlow: unrecognised instrument event "${e.type}" — skipped`);
      }
      return known;
    })
    .reduce((sum, e) => {
      const isOutflow = INSTRUMENT_OUTFLOW_TYPES.has(e.type);
      return sum + (isOutflow ? -e.amount : e.amount);
    }, 0);
}