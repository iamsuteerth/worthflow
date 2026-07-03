import type { FixedDeposit, RecurringDeposit } from "@/types/instrument";

import { describe, it, expect } from "vitest";
import { createInitialState } from "@/engine/stateFactory";
import { processFdLifecycle } from "@/engine/fdLifecycle";
import { processRdLifecycle } from "@/engine/rdLifecycle";
import { processInstrumentLifecycle } from "@/engine/instrumentLifecycle";
import { baseConfig, m, rdBankMaturity } from "@/engine/__tests__/factories";

const fd = (over: Partial<FixedDeposit> = {}): FixedDeposit => ({
  id: "fd1", type: "FD", name: "FD A", principal: 100_000, rate: 12, startMonth: m("2025-01"), durationMonths: 12, ...over,
});

const rd = (over: Partial<RecurringDeposit> = {}): RecurringDeposit => ({
  id: "rd1", type: "RD", name: "RD A", monthlyContribution: 10_000, rate: 6, startMonth: m("2025-01"), durationMonths: 3, ...over,
});

describe("processFdLifecycle", () => {
  it("creates an FD on its start month, debiting cash by the principal", () => {
    const config = baseConfig({ cash: { openingBalance: 500_000 }, instruments: [fd()] });
    const state = createInitialState(config);
    const result = processFdLifecycle(state, config, m("2025-01"));

    expect(result.state.cash).toBe(400_000);
    expect(result.state.fds).toHaveLength(1);
    expect(result.state.fds[0].currentValue).toBeCloseTo(100_000, 6);
    expect(result.events).toEqual([
      { id: "fd1-created", month: "2025-01", type: "FD_CREATED", amount: 100_000, description: "FD A" },
    ]);
  });

  it("does not recreate an FD that already exists in state", () => {
    const config = baseConfig({ cash: { openingBalance: 500_000 }, instruments: [fd()] });
    let state = createInitialState(config);
    state = processFdLifecycle(state, config, m("2025-01")).state;
    const cashAfterCreate = state.cash;
    const again = processFdLifecycle(state, config, m("2025-01"));
    expect(again.state.cash).toBe(cashAfterCreate);
    expect(again.events).toHaveLength(0);
  });

  it("matures an FD on its maturity month, crediting the compounded value to cash", () => {
    const config = baseConfig({ cash: { openingBalance: 500_000 }, instruments: [fd({ durationMonths: 1 })] });
    let state = createInitialState(config);
    state = processFdLifecycle(state, config, m("2025-01")).state;
    const matured = processFdLifecycle(state, config, m("2025-02"));

    const expectedValue = 100_000 * Math.pow(1 + 12 / 400, 1 / 3);
    expect(matured.state.fds).toHaveLength(0);
    expect(matured.state.cash).toBeCloseTo(400_000 + expectedValue, 4);
    expect(matured.events[0]).toMatchObject({ type: "FD_MATURED", description: "FD A" });
  });
});

describe("processRdLifecycle", () => {
  it("creates an RD on its start month and debits the first contribution", () => {
    const config = baseConfig({ cash: { openingBalance: 100_000 }, instruments: [rd()] });
    const state = createInitialState(config);
    const result = processRdLifecycle(state, config, m("2025-01"));

    expect(result.state.cash).toBe(90_000);
    expect(result.state.rds).toHaveLength(1);
    expect(result.state.rds[0].totalContributed).toBe(10_000);
    expect(result.events[0]).toMatchObject({ type: "RD_CREATED", amount: 10_000 });
  });

  it("matures an RD on its maturity month and pays out the accrued value", () => {
    const config = baseConfig({
      forecast: { startMonth: m("2025-01"), totalMonths: 4 },
      cash: { openingBalance: 100_000 },
      instruments: [rd()],
    });
    let state = createInitialState(config);
    for (const month of ["2025-01", "2025-02", "2025-03", "2025-04"] as const) {
      state = processRdLifecycle(state, config, m(month)).state;
    }
    expect(state.rds).toHaveLength(0);
    expect(state.cash).toBeCloseTo(70_000 + rdBankMaturity(10_000, 6, 3), 2);
  });
});

describe("processInstrumentLifecycle", () => {
  it("runs FD and RD lifecycles together and merges their events", () => {
    const config = baseConfig({ cash: { openingBalance: 500_000 }, instruments: [fd(), rd()] });
    const state = createInitialState(config);
    const result = processInstrumentLifecycle(state, config, m("2025-01"));

    expect(result.state.cash).toBe(390_000);
    expect(result.events.map((e) => e.type).sort()).toEqual(["FD_CREATED", "RD_CREATED"]);
  });
});
