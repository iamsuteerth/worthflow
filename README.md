# 💰 Finance Planner

A personal finance forecasting and scenario planning tool that helps you model future cash flow, investments, deposits, and net worth.

Build a financial plan, simulate different life events, and understand how your finances evolve month by month.

## ✨ Features

### 📈 Financial Forecasting

Project your future finances with a month-by-month simulation engine.

Track:

* Cash Balance
* Investment Corpus
* Fixed Deposits (FD)
* Recurring Deposits (RD)
* Net Worth

Every forecast is generated from a deterministic simulation engine that accounts for income, expenses, investments, deposits, and lifecycle events.

### 🏦 Fixed Deposits (FD)

Create and track Fixed Deposits directly within your plan.

Supported:

* New FDs created during the forecast period
* Existing FDs opened before the forecast begins
* Automatic maturity payouts
* Compound growth calculations
* Historical FD value reconstruction

The engine correctly models:

* FD creation cash outflows
* Growth over time
* Maturity proceeds
* Net worth impact

### 🔄 Recurring Deposits (RD)

Model recurring deposits with monthly contributions.

Supported:

* New RDs
* Existing RDs already in progress
* Historical contribution reconstruction
* Monthly contribution deductions
* Automatic maturity payouts

The simulator tracks:

* Monthly RD contributions
* Accrued value
* Maturity proceeds
* Cashflow impact
* Net worth impact

### 🛠️ Guided Plan Builder

Create a financial plan without editing JSON.

Configure:

* Forecast duration
* Monthly income
* Monthly expenses
* Opening cash balance
* Existing investment corpus
* Investment schedules
* Credit card payments
* One-off expenses
* Salary changes
* Bonus income
* Fixed Deposits
* Recurring Deposits

The builder supports both future and historical instruments.

### 🎯 Scenario Planning

Test alternate financial outcomes without changing your base plan.

Simulate:

* Salary hikes
* Bonus income
* Large purchases
* New FDs
* New RDs
* Unexpected expenses

Scenarios can be applied instantly and removed at any time.

### 💸 Cashflow Analysis

Understand exactly where money is moving each month.

Track:

* Salary income
* Bonus income
* Monthly expenses
* Credit card payments
* One-off expenses
* Investment contributions
* FD creation and maturity
* RD contributions and maturity

The cashflow table reconciles directly with simulated balances.

### 📊 Wealth Projection

Interactive chart showing:

* Cash
* Investment Corpus
* Net Worth

Tooltips include:

* Month-over-month changes
* Financial events occurring that month
* Deposit maturities
* Bonuses and expenses

### 📋 Detailed Dashboard Views

Multiple views are available for analyzing projections.

#### Forecast Table

Month-by-month balance projection.

#### Cashflow Table

Detailed inflow and outflow analysis.

#### Net Worth Table

Asset-level breakdown of:

* Cash
* Investments
* FDs
* RDs
* Total Net Worth

#### Instruments Table

View all active deposits and instruments.

#### Event Timeline

Chronological record of:

* Bonuses
* Salary changes
* Expenses
* FD creation
* FD maturity
* RD creation
* RD maturity

#### Asset Breakdown

Visual distribution of wealth across asset classes.

### 💾 Import & Export

Plans can be exported and restored later.

Uses a versioned format:

```json
{
  "version": 1,
  "baseConfig": {},
  "overrides": {}
}
```

Useful for:

* Backups
* Sharing plans
* Strategy comparison
* Long-term planning

### ✅ Import Validation

Imported plans are validated using Zod before being loaded.

Validation includes:

* Month format validation
* FD validation
* RD validation
* Income validation
* Expense validation
* Investment validation
* Configuration structure validation

Invalid plans are rejected before they can corrupt forecasts.

### 🌙 Theme Support

Choose your preferred appearance.

Supported:

* Light Mode
* Dark Mode

Theme preference is saved automatically.

## 🧮 Supported Financial Events

### Income

* Monthly Salary
* Salary Changes
* Bonus Income

### Expenses

* Monthly Expenses
* Credit Card Payments
* One-Off Expenses

### Investments

* Monthly Investment Schedules
* Investment Corpus Growth Tracking

### Instruments

* Fixed Deposits (FD)
* Existing Fixed Deposits
* Recurring Deposits (RD)
* Existing Recurring Deposits

## ⚙️ Simulation Engine

The simulation engine processes financial activity month by month.

It models:

* Income inflows
* Expense outflows
* Investment allocations
* FD lifecycles
* RD lifecycles
* Deposit maturities
* Scenario events

All forecasts shown in the dashboard are generated from this engine.

## 📁 Project Structure

```text
src
├── app            # Application setup
├── assets         # Static assets
├── components     # UI components
├── data           # Default configuration
├── engine         # Forecast simulation engine
├── hooks          # Shared hooks
├── pages          # Route pages
├── store          # Zustand stores
└── types          # TypeScript types
```

## 🚀 Getting Started

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

## 🛠️ Built With

* React
* TypeScript
* Vite
* Mantine
* Mantine Charts
* Zustand
* Zod
* Tabler Icons