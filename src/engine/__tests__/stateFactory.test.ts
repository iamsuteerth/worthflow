import type { FixedDeposit, RecurringDeposit } from "@/types/instrument";

import { describe, it, expect } from "vitest";
import { createInitialState } from "@/engine/stateFactory";
import { baseConfig, account, m } from "@/engine/__tests__/factories";

describe("createInitialState", () => {
  it("seeds cash from the opening balance and zeroes account balances", () => {
    const config = baseConfig({
      cash: { openingBalance: 250_000 },
      investments: {
        accounts: [account({ id: "a1" }), account({ id: "a2" })],
        amountOverrides: [],
        returnOverrides: [],
      },
    });
    const state = createInitialState(config);
    expect(state.cash).toBe(250_000);
    expect(state.accountBalances).toEqual({ a1: 0, a2: 0 });
    expect(state.investmentCorpus).toBe(0);
  });

  it("seeds a historical FD that started before the forecast with its accrued value", () => {
    const histFd: FixedDeposit = {
      id: "fd1", type: "FD", name: "Old FD", principal: 100_000, rate: 10, startMonth: m("2024-01"), durationMonths: 24,
    };
    const config = baseConfig({ forecast: { startMonth: m("2025-01"), totalMonths: 12 }, instruments: [histFd] });
    const state = createInitialState(config);
    expect(state.fds).toHaveLength(1);
    expect(state.fds[0].currentValue).toBeCloseTo(100_000 * Math.pow(1 + 10 / 400, 12 / 3), 4);
  });

  it("includes an FD that matures exactly on the forecast start month", () => {
    const histFd: FixedDeposit = {
      id: "fd1", type: "FD", name: "Maturing FD", principal: 100_000, rate: 10, startMonth: m("2024-01"), durationMonths: 12,
    };
    const config = baseConfig({ forecast: { startMonth: m("2025-01"), totalMonths: 12 }, instruments: [histFd] });
    expect(createInitialState(config).fds).toHaveLength(1);
  });

  it("excludes an FD that already matured before the forecast", () => {
    const oldFd: FixedDeposit = {
      id: "fd1", type: "FD", name: "Done FD", principal: 100_000, rate: 10, startMonth: m("2023-01"), durationMonths: 12,
    };
    const config = baseConfig({ forecast: { startMonth: m("2025-01"), totalMonths: 12 }, instruments: [oldFd] });
    expect(createInitialState(config).fds).toHaveLength(0);
  });

  it("excludes an FD that starts at or after the forecast (it is created in-loop instead)", () => {
    const futureFd: FixedDeposit = {
      id: "fd1", type: "FD", name: "New FD", principal: 100_000, rate: 10, startMonth: m("2025-01"), durationMonths: 12,
    };
    const config = baseConfig({ forecast: { startMonth: m("2025-01"), totalMonths: 12 }, instruments: [futureFd] });
    expect(createInitialState(config).fds).toHaveLength(0);
  });

  it("seeds a historical RD with its contributions-to-date and accrued value", () => {
    const histRd: RecurringDeposit = {
      id: "rd1", type: "RD", name: "Old RD", monthlyContribution: 5_000, rate: 6, startMonth: m("2024-07"), durationMonths: 12,
    };
    const config = baseConfig({ forecast: { startMonth: m("2025-01"), totalMonths: 12 }, instruments: [histRd] });
    const state = createInitialState(config);
    expect(state.rds).toHaveLength(1);
    expect(state.rds[0].totalContributed).toBe(30_000);
    const expected = 5_000 * [5, 4, 3, 2, 1, 0].reduce((s, k) => s + Math.pow(1 + 6 / 400, k / 3), 0);
    expect(state.rds[0].currentValue).toBeCloseTo(expected, 4);
    expect(state.rds[0].currentValue).toBeGreaterThan(30_000);
  });
});
