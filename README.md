# 💰 Finance Planner

A personal finance forecasting and scenario-planning tool that helps you model cash flow, investments, deposits, and net worth over time.

Forecast your finances, simulate life events, compare scenarios, and see how your wealth evolves month by month.

## ✨ Features

* 📈 Long-term financial forecasting
* 💵 Cash flow tracking
* 📊 Investment performance and XIRR
* 🏦 Fixed Deposit (FD) planning
* 🔁 Recurring Deposit (RD) planning
* 🎯 Scenario simulation
* 📉 Return assumption overrides
* 💰 Portfolio deposits and withdrawals
* 📊 Interactive charts and timelines
* 💾 Save, export, and restore plans
* 🌙 Light & Dark mode

# 🚀 Financial Forecasting

Generate month-by-month projections of your finances.

### Key Metrics

* 💵 Cash Balance
* 📈 Investment Corpus
* 🏦 Fixed Deposits
* 🔁 Recurring Deposits
* 💎 Net Worth
* 📊 XIRR (Money-Weighted Return)

# 📈 Investments

Model investment growth using configurable return assumptions.

### Supported Features

* Opening Investment Corpus
* Monthly Contributions
* Contribution Overrides
* Portfolio Deposits & Withdrawals
* Annual Return Assumptions
* Return Override Periods
* XIRR Tracking
* Net Worth Integration

# 🏦 Fixed Deposits (FD)

Track existing and future fixed deposits.

### Supported Features

* Existing FDs
* New FDs
* Interest Growth
* Automatic Maturity Payouts
* Net Worth Integration

# 🔁 Recurring Deposits (RD)

Track recurring deposits and their impact on future cash flow.

### Supported Features

* Existing RDs
* New RDs
* Monthly Contributions
* Interest Accrual
* Automatic Maturity Payouts

# 🛠️ Guided Plan Builder

Create plans through a simple step-by-step workflow.

### 💼 Income

* Monthly Salary
* Salary Changes
* Bonus Income

### 💸 Expenses

* Monthly Expenses
* Credit Card Payments
* One-Off Expenses

### 📈 Investments

* Opening Corpus
* Contribution Schedule
* Return Assumptions

### 💵 Cash

* Opening Cash Balance

### 🏦 Deposits

* Fixed Deposits
* Recurring Deposits

# 🎭 Scenario Planning

Test alternate futures without changing your base plan.

### Income Events

* Salary Increases
* Salary Reductions
* Job Loss
* Bonuses

### Expense Events

* Major Purchases
* Unexpected Expenses
* Credit Card Events

### Investment Events

* Contribution Changes
* Deposits
* Withdrawals
* Return Overrides

### Deposit Events

* New FDs
* New RDs

### Compare Against Base Plan

* Net Worth Difference
* Cash Balance Difference
* Investment Difference
* Lowest Cash Position Difference

# 💸 Cash Flow Analysis

See where your money comes from and where it goes.

### Inflows

* Salary
* Bonuses
* Investment Withdrawals
* FD Maturities
* RD Maturities

### Outflows

* Expenses
* Credit Card Payments
* Investment Contributions
* Portfolio Deposits
* FD Creation
* RD Contributions
* One-Off Expenses

# 📊 Wealth Projection

Visualize long-term growth with interactive charts.

### Charts

* Cash Balance
* Investments
* Net Worth

### Features

* Monthly Tooltips
* Event Highlights
* Portfolio Activity Tracking
* Scenario Comparisons

### Performance Metrics

* XIRR
* Final Net Worth
* Final Investment Corpus
* Final Cash Position

# 🖥️ Dashboard Views

### 📅 Forecast Table

Month-by-month projections.

### 💸 Cash Flow Table

Detailed inflow and outflow breakdown.

### 💎 Net Worth Table

Asset-level wealth tracking.

### 🏦 Instruments Table

Active FDs and RDs.

### 🕒 Event Timeline

* Salary Changes
* Bonuses
* Expenses
* Credit Card Events
* FD Events
* RD Events

### 📈 Investment Timeline

* Deposits
* Withdrawals
* Contribution Changes
* Return Overrides

# 💾 Saved Scenarios

Save and revisit alternate plans.

### Features

* Multiple Saved Scenarios
* Instant Loading
* Scenario Comparison
* Export Support

# 📦 Import & Export

Export and restore complete plans.

### Export Format

```json
{
  "version": 1,
  "baseConfig": {},
  "overrides": {},
  "savedScenarios": []
}
```

### Use Cases

* Backups
* Sharing Plans
* Strategy Comparison
* Scenario Testing

# 🛡️ Import Validation

Imported plans are validated before loading.

### Checks

* Configuration Structure
* Dates & Month Formats
* Income & Expense Rules
* Investment Rules
* Deposit Definitions
* Return Overrides
* Portfolio Transactions
* Runtime Events
* Saved Scenarios

# 🌗 Theme Support

* ☀️ Light Mode
* 🌙 Dark Mode

Theme preference is saved automatically.

# 📚 Supported Events

### 💼 Income

* Salary
* Salary Changes
* Bonuses

### 💸 Expenses

* Monthly Expenses
* Credit Card Payments
* One-Off Expenses

### 📈 Investments

* Contributions
* Contribution Overrides
* Return Overrides
* Deposits
* Withdrawals

### 🏦 Deposits

* Fixed Deposits (FD)
* Recurring Deposits (RD)

# 🏗️ Project Structure

```text
src
├── app
├── assets
├── components
├── data
├── engine
├── hooks
├── pages
├── store
└── types
```

# 🚀 Getting Started

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

### Run Lint

```bash
npm run lint
```

# 🧰 Built With

* React
* TypeScript
* Vite
* Mantine
* Mantine Charts
* Zustand
* Zod
* Tabler Icons

# 🎯 Questions It Can Help Answer

* Can I afford this purchase next year?
* How will a salary change affect my finances?
* How much could my net worth grow?
* What is my portfolio's XIRR?
* Should I invest more or create an FD?
* What happens if returns are lower than expected?
* What if I need to withdraw from investments?
* What is my lowest future cash position?
* How do different scenarios compare?
* How long can I manage without income?

**Plan smarter. Forecast confidently. Build wealth intentionally. 💰📈**
