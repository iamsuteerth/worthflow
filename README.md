# 💰 Finance Planner

A powerful personal finance forecasting and scenario-planning tool that helps you model cash flow, investments, deposits, and net worth over time.

Build realistic financial plans, simulate life events, and understand how your wealth evolves month by month.

## ✨ Highlights

📈 Forecast your finances into the future

💵 Track cash, investments, FDs, and RDs

🎯 Model real-life financial events

🔄 Compare alternate scenarios

📊 Visualize wealth growth with charts

💾 Save, export, and restore plans

🌙 Light & Dark mode support

## 🚀 Financial Forecasting

Generate detailed month-by-month projections of your financial future.

### Track Key Metrics

* 💵 Cash Balance
* 📈 Investment Corpus
* 🏦 Fixed Deposits (FD)
* 🔁 Recurring Deposits (RD)
* 💎 Net Worth

## 🏦 Fixed Deposits (FD)

Model fixed deposits directly within your financial forecast.

### Supported Features

* ✅ Existing FDs
* ✅ New FDs during forecast
* ✅ Automatic maturity payouts
* ✅ Interest growth calculations
* ✅ Net worth integration

## 🔁 Recurring Deposits (RD)

Track recurring deposits and their impact on future cash flow.

### Supported Features

* ✅ Existing RDs
* ✅ New RDs
* ✅ Monthly contributions
* ✅ Interest accrual
* ✅ Automatic maturity payouts

## 🛠️ Guided Plan Builder

Create and edit plans through an intuitive UI.

### Configure

#### 💼 Income

* Monthly Salary
* Salary Changes
* Bonus Income

#### 💸 Expenses

* Monthly Expenses
* Credit Card Payments
* One-Off Expenses

#### 📈 Investments

* Opening Investment Corpus
* Investment Contributions
* Investment Schedule

#### 💰 Cash

* Opening Cash Balance

#### 🏦 Deposits

* Fixed Deposits
* Recurring Deposits

## 🎭 Scenario Planning

Create alternate futures without modifying your base forecast.

### Simulate

* 📈 Salary Increases
* 🎁 Bonus Income
* 🏠 Major Purchases
* 🏦 New FDs
* 🔁 New RDs
* 🚨 Unexpected Expenses

### Compare Against Base Plan

* 💎 Net Worth Change
* 💵 Cash Balance Change
* ⚠️ Lowest Cash Position Change

## 📊 Cashflow Analysis

Understand where your money comes from and where it goes.

### Inflows

* 💼 Salary Income
* 🎁 Bonus Income

### Outflows

* 🛒 Expenses
* 💳 Credit Card Payments
* 📉 Investments
* 🏦 FD Activity
* 🔁 RD Activity
* 💸 One-Off Expenses

## 📈 Wealth Projection

Interactive charts help visualize long-term growth.

### Available Charts

* 💵 Cash Balance
* 📈 Investments
* 💎 Net Worth

### Features

* Event Markers
* Monthly Tooltips
* Historical Comparison
* Scenario Comparison

## 🖥️ Dashboard Views

### 📅 Forecast Table

Month-by-month financial projection.

### 💸 Cashflow Table

Detailed breakdown of inflows and outflows.

### 💎 Net Worth Table

Asset-level wealth tracking.

### 🏦 Instruments Table

View active FDs and RDs.

### 🕒 Event Timeline

Chronological view of:

* Salary Changes
* Bonuses
* Expenses
* FD Events
* RD Events

### 🥧 Asset Breakdown

Visual allocation across asset classes.

## 💾 Saved Scenarios

Store alternate plans for future comparison.

### Features

* Save multiple scenarios
* Instant scenario loading
* Impact comparison
* Included in exports

## 📦 Import & Export

Export and restore complete financial plans.

### Export Structure

```json
{
  "version": 1,
  "baseConfig": {},
  "overrides": {},
  "savedScenarios": []
}
```

### Ideal For

* 💾 Backups
* 🤝 Sharing plans
* 🔍 Comparing strategies
* 🧪 Experimenting with scenarios

## 🛡️ Import Validation

Plans are validated before loading.

### Validation Checks

* Configuration Structure
* Month Formats
* Deposit Definitions
* Income & Expense Rules
* Runtime Events
* Saved Scenarios

## 🌗 Theme Support

Choose your preferred experience.

* ☀️ Light Mode
* 🌙 Dark Mode

Theme preference is automatically saved.

## 📚 Supported Events

### 💼 Income

* Monthly Salary
* Salary Changes
* Bonus Income

### 💸 Expenses

* Monthly Expenses
* Credit Card Payments
* One-Off Expenses

### 📈 Investments

* Investment Contributions

### 🏦 Deposits

* Fixed Deposits (FD)
* Recurring Deposits (RD)

## 🏗️ Project Structure

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

## 🚀 Getting Started

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Run Linting

```bash
npm run lint
```

## 🧰 Built With

* ⚛️ React
* 🔷 TypeScript
* ⚡ Vite
* 🎨 Mantine
* 📊 Mantine Charts
* 🐻 Zustand
* ✅ Zod
* 🎯 Tabler Icons

## 🎯 Goal

Finance Planner helps answer questions like:

* Can I afford this purchase next year?
* What happens if my salary increases?
* How much will my net worth grow?
* Should I invest or create an FD?
* What is my lowest future cash position?
* How do different scenarios compare?

Plan smarter. Forecast confidently. Build wealth intentionally. 💰📈
