# 💰 Finance Planner

A simple personal finance simulator for forecasting your future cash, investments, deposits, and net worth.

Build a financial plan, test different scenarios, and see how your wealth evolves month by month.

## ✨ What You Can Do

### 📈 Forecast Your Finances

Project your future:

* Cash balance
* Investment corpus
* Fixed Deposits (FD)
* Recurring Deposits (RD)
* Net worth

See exactly how your money changes over time with interactive charts and detailed tables.

### 🛠️ Build a Financial Plan

Use the guided planner to create a forecast in minutes.

Configure:

* Forecast duration
* Monthly income
* Monthly expenses
* Starting cash balance
* Existing investments
* Investment schedules
* One-time events
* Deposits and instruments

No JSON editing required.

---

### 🎯 Scenario Planning

Want to know what happens if you:

* Receive a bonus?
* Get a salary hike?
* Make a large purchase?
* Start a new FD?
* Open an RD?

Create scenarios instantly and compare outcomes without changing your original plan.

---

### 💾 Save & Restore Plans

Export your plan as a JSON file.

Import it later to continue exactly where you left off.

Perfect for:

* Backups
* Sharing plans
* Versioning different financial strategies

## 📊 Dashboard

The dashboard provides multiple views of your forecast:

### Summary

Quick overview of:

* Net Worth
* Cash
* Investments
* Active Instruments

### Wealth Projection

Interactive chart showing:

* Cash
* Investments
* Total Net Worth

with month-by-month change tracking.

### Detailed Analysis

Includes:

* Forecast Table
* Cashflow Table
* Net Worth Table
* Instruments Table
* Event Timeline
* Asset Breakdown

## 🌙 Theme Support

Choose your preferred look:

* Light Mode
* Dark Mode

Your preference is saved automatically.

## 📁 Project Structure

```text
src
├── app            # Application setup
├── components     # UI components
├── data           # Default configuration
├── engine         # Forecast simulation engine
├── hooks          # Shared hooks
├── store          # Zustand stores
└── types          # TypeScript types
```

## 🚀 Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

---

## 📦 Export Format

Plans are exported using a versioned format:

```json
{
  "version": 1,
  "baseConfig": {},
  "overrides": {}
}
```

This allows plans to be safely restored in the future as the application evolves.

## 🧮 Supported Financial Events

### Income

* Monthly salary
* Salary changes
* Bonus income

### Expenses

* Monthly expenses
* One-off expenses
* Credit card payments

### Investments

* Investment schedules
* Investment pauses
* Investment increases

### Instruments

* Fixed Deposits (FD)
* Recurring Deposits (RD)

---

## 🛠️ Built With

* React
* TypeScript
* Vite
* Mantine
* Mantine Charts
* Zustand
* Zod
* Tabler Icons