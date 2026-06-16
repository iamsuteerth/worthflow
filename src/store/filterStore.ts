import { create } from "zustand";
import type { MonthKey } from "@/types/simulation";
import type { EventCategory } from "@/engine/eventCategories";

interface FilterStore {
  startMonth: MonthKey | null;
  endMonth: MonthKey | null;
  setStartMonth: (month: MonthKey | null) => void;
  setEndMonth: (month: MonthKey | null) => void;
  setRange: (start: MonthKey | null, end: MonthKey | null) => void;
  reset: () => void;

  categoryFilter: EventCategory[];
  toggleCategory: (category: EventCategory) => void;
  resetCategoryFilter: () => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const useFilterStore = create<FilterStore>((set) => ({
  startMonth: null,
  endMonth: null,

  setStartMonth: (month) => set({ startMonth: month }),
  setEndMonth: (month) => set({ endMonth: month }),
  setRange: (start, end) => set({ startMonth: start, endMonth: end }),
  reset: () => set({ startMonth: null, endMonth: null }),

  categoryFilter: [],
  toggleCategory: (category) =>
    set((s) => ({ categoryFilter: toggle(s.categoryFilter, category) })),
  resetCategoryFilter: () => set({ categoryFilter: [] }),
}));