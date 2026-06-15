// src/hooks/useFilteredSimulation.ts
import { useMemo } from "react";
import { useSimulation } from "@/hooks/useSimulation";
import { useFilterStore } from "@/store/filterStore";
import type { SimulationResult } from "@/engine/simulate";

/**
 * Returns the simulation result with rows filtered to the active month range.
 * Summary cards, XIRR, net worth, and lowest-cash always use the FULL result
 * (per spec — only the table/timeline views respect the filter).
 */
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
      // Filtered rows for display
      rows: filtered,
      // Summary always reflects the full simulation (spec requirement)
      summary: full.summary,
    };
  }, [full, startMonth, endMonth]);
}