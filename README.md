# 💰 Finance Planner

A personal finance forecasting tool that helps you understand how your money, investments, and net worth may evolve over time.

Build a plan, test "what if" scenarios on top of it, and compare outcomes — all running locally in your browser, with your data never leaving your device.

## ✨ What You Can Do

### 🧭 Build Your Plan

A guided **Plan Builder** wizard walks you through setting up your starting point:

1. **Forecast Timeline** — choose a start month and horizon (12–48 months)
2. **Financial Baseline** — monthly income, monthly expenses, opening cash balance
3. **Investment Accounts** — add one or more existing portfolios
4. **Events** — one-off expenses, recurring expenses, credit card bills, bonuses, salary changes
5. **Instruments** — existing Fixed Deposits and Recurring Deposits
6. **Review & Generate** — inspect a summary, export the config, and generate your forecast

You can re-run the builder at any time to start a new plan from scratch.

### 📈 Forecast Your Finances

Generate month-by-month projections for:

* Cash Balance
* Investments
* Fixed Deposits (FD)
* Recurring Deposits (RD)
* Net Worth
* XIRR (Money-Weighted Return)

### 🎭 Test Different Scenarios

Explore alternate futures without modifying your base plan, using the **Scenario Lab** sidebar.

Examples:

* Salary changes
* Bonuses
* Major expenses (one-off, recurring, credit card)
* **Spending Override** — replace your baseline monthly spend for any date range
* **Opening Cash Override** — start the scenario with a different cash balance (negative values allowed)
* New investment accounts
* Investment deposits & withdrawals
* Contribution and return overrides
* FD and RD creation

A **Scenario Banner** keeps you oriented: it summarizes how many modifications are active, shows a badge per event type (click to jump straight to that group in the Events list), and flags any accounts created during the scenario.

The **Scenario Lab** sidebar is organized into six sections — **Expenses**, **Cash**, **Investments**, **FD**, **RD**, and **Events** — so each type of modification has a focused home.

Instantly compare results against your original plan, then save, switch between, import, or export scenarios whenever you like.

### 📊 Track Investments

Manage multiple investment accounts independently.

For each account you can:

* Define opening balance, start month, monthly contribution, and expected return
* Add deposits
* Make withdrawals
* Create contribution (amount) overrides for a date range
* Create return overrides for a date range
* Delete the account entirely — with confirmation, cascading to its overrides, deposits, and withdrawals

Each account's detail view shows a **visual schedule timeline** — every segment of its contribution and return history is explicitly labeled (Default Contribution, Amount Override, Default Return, Return Override) so you always know what's driving the numbers, and overrides can be edited or removed right from there.

Track performance using:

* Current Value
* Total Contributions
* XIRR
* Net Worth Impact

Accounts added during a scenario (not part of your original plan) are marked with an **"Added"** badge.

### 🏦 Plan Fixed Deposits & Recurring Deposits

Model both existing and future deposits.

#### Fixed Deposits

* Create new FDs (principal, rate, start month, duration)
* Track maturity values
* Automatic payout handling at maturity

#### Recurring Deposits

* Monthly contributions, rate, start month, duration
* Interest accrual
* Automatic maturity payouts

New FD/RD/Deposit amounts are validated against your projected **available cash** at the chosen month — you can't commit more than the plan can actually afford.

### 💸 Understand Cash Flow

See where money comes from and where it goes.

#### Income

* Salary
* Bonuses
* Investment Withdrawals
* FD Maturities
* RD Maturities

#### Expenses

* Living Expenses (baseline, with optional per-range Spending Override)
* Credit Card Payments
* One-Off Expenses
* Recurring Expenses (Monthly or Annual)
* Investments
* FD Creation
* RD Contributions

### 🔎 Filter by Month Range

A single, global **month-range filter** sits above the dashboard. Set a "From"/"To" window and every time-series table and timeline narrows to that range together — clear it to instantly return to the full forecast horizon. (Available-cash checks for new FDs/RDs/deposits always use the full forecast, regardless of this filter.)

### 📈 Visualize Your Future

Interactive dashboards help you understand:

* Cash Position
* Investment Growth
* Net Worth Progression
* Financial Events
* Scenario Impact

## 🧱 Core Concepts

### Base Plan

Your primary financial plan, created via the Plan Builder.

Contains:

* Income
* Expenses
* Cash
* Investments
* FDs
* RDs
* Forecast Horizon

### Scenarios

Temporary modifications applied on top of the Base Plan.

Examples:

* New investment account
* Salary increase
* Unexpected expense
* Investment deposit
* Return override

Scenarios allow experimentation without changing the underlying plan. They can be saved, reloaded, reset, exported, and imported independently of the Base Plan.

### Investment Accounts

Each investment account is managed independently.

Examples:

* Index Fund
* Mutual Funds
* NPS
* US Stocks
* Retirement Portfolio

Accounts support:

* Monthly contributions
* Deposits
* Withdrawals
* Contribution overrides
* Return overrides
* Deletion (cascades to its overrides, deposits, and withdrawals)

## 📋 Available Views

The dashboard offers eight focused views, all driven by a single global month-range filter:

| View | Shows |
| --- | --- |
| **Forecast** | Month-by-month projections of cash, investments, and net worth |
| **Cashflow** | Detailed income vs. expense breakdown per month |
| **Net Worth** | Asset growth over time |
| **Instruments** | Every FD/RD — rate, duration, maturity month, principal, interest, maturity value |
| **One-Offs** | All one-off expenses with month and amount |
| **Timeline** | Chronological view of all financial events |
| **Investment Timeline** | Timeline focused on investment-related activity (deposits, withdrawals, overrides) |
| **Investment Accounts** | Per-account value, visual contribution/return schedule, overrides, XIRR, and deletion |

## 💾 Save, Import & Export

### Save Scenarios

Store multiple scenario variations and switch between them instantly.

### Export Plans

Export complete plans (base plan, active scenario, and saved scenarios) as a `.wfplan` file for:

* Backup
* Sharing
* Archival

### Import Plans

Restore previously exported plans with built-in validation.

## 🔒 Login & Data Privacy

Finance Planner is gated behind a single shared password (set via the `VITE_APP_PASSWORD` environment variable at build time), with the session held in your browser for up to an hour.

There is **no backend and no account system** — everything (your base plan, scenarios, and saved scenarios) is stored locally in your browser's storage. Nothing is sent to a server.

## 🌙 Theme Support

* Light Mode
* Dark Mode

Theme preference is saved automatically.

## 🚀 Getting Started

### Install Dependencies

```bash
npm install
```

### Configure the Access Password

Create a `.env` file in the project root:

```bash
VITE_APP_PASSWORD=your-chosen-password
```

### Run Development Server

```bash
npm run dev
```

### Create Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Run Lint Checks

```bash
npm run lint
```

## 📚 Documentation

For a complete walkthrough of every feature, see:

👉 [MANUAL.md](./MANUAL.md)

## 🛠️ Built With

* React
* TypeScript
* Vite
* Mantine (Core, Charts, Hooks, Notifications)
* Zustand
* Zod
* Recharts
* Tabler Icons

## 🎯 Questions Finance Planner Can Help Answer

* Can I afford a major purchase?
* How much cash will I have available in the future?
* How will a salary change affect my finances?
* What happens if my monthly spending rises or falls for a period?
* What if I start the scenario with more or less cash?
* What happens if investment returns are lower than expected?
* Should I invest more or create an FD?
* How much could my net worth grow?
* What is my portfolio's XIRR?
* What is my lowest future cash position?
* How do different scenarios compare?

**Plan smarter. Forecast confidently. Build wealth intentionally.**
