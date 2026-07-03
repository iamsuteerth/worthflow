import type { SimulationResult } from "@/engine/simulate";

import { useMemo } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { useFilterStore } from "@/store/filterStore";

export function useFilteredSimulation(): SimulationResult {
  const full = useSimulation();
  const { startMonth, endMonth } = useFilterStore();

  return useMemo(() => {
    if (!startMonth && !endMonth) return full;

    const filtered = full.rows.filter((row) => {
      if (startMonth && row.month < startMonth) return false;
      if (endMonth && row.month > endMonth) return false;
      return true;
    });

    return {
      rows: filtered,
      summary: full.summary,
    };
  }, [full, startMonth, endMonth]);
}