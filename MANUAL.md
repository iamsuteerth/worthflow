# 📘 Worth Flow User Manual

Welcome to Worth Flow.

This guide explains how to create an account, build a financial plan, model investments, test scenarios, save your work to the cloud, and interpret the results.

# Table of Contents

1. Getting Started
2. Core Concepts
3. The Plan Builder
4. Managing Investment Accounts
5. Fixed Deposits (FD)
6. Recurring Deposits (RD)
7. The Scenario Lab
8. Scenario Planning
9. Understanding Overrides
10. Filtering by Month Range
11. Dashboards & Reports
12. Saving, Importing & Exporting
13. Data & Privacy
14. Frequently Asked Questions

# 1. Getting Started

Worth Flow helps you answer questions such as:

* Can I afford a major purchase?
* How will my investments grow?
* What happens if my income changes?
* How much cash will I have available in the future?
* What is my expected net worth over time?

## Creating an Account & Signing In

Worth Flow uses individual accounts secured by your email and a password.

**Sign up**

1. On the login screen, choose **Create account**.
2. Enter your email and a password (at least 8 characters, with an uppercase letter, a lowercase letter, and a number).
3. We email you a **6-digit verification code**. Enter it to confirm your account.
4. After verifying, sign in with your email and password.

> Didn't finish entering the code? No problem — just start sign-up again with the same email (or sign in), and Worth Flow will send a fresh code and take you back to the verification screen.

**Forgot your password?**

Choose **Forgot password?**, enter your email, and we'll send a reset code. Enter the code along with your new password to regain access.

**Signing out**

Open your **Profile** (the avatar in the top-right) and choose **Sign out**. For your privacy, signing out clears your current plan from this browser — your saved plans remain safely in the cloud.

## How It Works

The planner works in two phases:

1. **Build** — use the **Plan Builder** to describe your current finances (income, expenses, cash, investments, FDs, RDs, and a forecast horizon). This becomes your **Base Plan**.
2. **Forecast & Explore** — switch to the **Forecast** view to see your projections, then use the **Scenario Lab** to layer temporary "what if" changes on top without touching the Base Plan.

You can switch between "Build Plan" and "Forecast" at any time using the tabs at the top of the app. Re-running the builder generates a brand-new plan from scratch.

# 2. Core Concepts

## Base Plan

Your Base Plan represents your current financial situation.

It contains:

* Income
* Expenses
* Cash
* Investment Accounts
* Fixed Deposits
* Recurring Deposits
* Forecast Horizon

Think of it as your "default future."

## Scenarios

Scenarios are temporary modifications applied to the Base Plan.

Examples:

* Salary increase
* Bonus income
* Major expense
* New investment account
* Investment withdrawal
* New FD
* New RD

Scenarios allow you to explore possibilities without permanently changing the Base Plan. They live independently and can be saved, reloaded, reset, exported, and imported.

## Forecast Horizon

The forecast horizon determines how far into the future the planner will simulate, set when building your plan.

Examples:

* 12 Months
* 24 Months
* 36 Months
* 48 Months

All charts, reports, and projections are generated within this period. Annual recurring expenses and available-cash checks are also bounded by this horizon (see [Scenario Planning](#8-scenario-planning) and [Understanding Overrides](#9-understanding-overrides)).

# 3. The Plan Builder

The Plan Builder is a six-step wizard that produces your Base Plan. Each step must be completed before moving to the next.

## Step 1: Forecast Timeline

* **Start Month** — when your forecast begins
* **Horizon** — length of the forecast, from 12 to 48 months (shown as "X yr Y mo")

## Step 2: Financial Baseline

* **Monthly Income** — your regular take-home income (minimum ₹1,000)
* **Monthly Expenses** — your regular living expenses
* **Opening Cash Balance** — liquid cash you have today

The step shows your computed **monthly surplus** (income minus expenses) so you can sanity-check your numbers as you go.

## Step 3: Investment Accounts

Add any existing investment portfolios. For each account, provide:

| Field | Description |
| --- | --- |
| Name | Account name (e.g. "Index Fund", "NPS", "US Stocks") |
| Start Month | When the account begins in the forecast |
| Opening Balance | Current invested value |
| Default Monthly Contribution | Regular SIP amount |
| Default Annual Return | Expected annual growth rate (-99.99% to 1000%) |

You can add multiple accounts and remove any you've added before moving on.

## Step 4: Events

Add any known future events that should be part of your Base Plan, across five categories:

* **One-Off Expense** — month, label, amount
* **Recurring Expense** — name, amount, and either **Monthly** (Start Month + End Month) or **Annual** (Start Month + Number of Years) frequency
* **Credit Card Bill** — month, label, amount
* **Bonus Income** — month, description, amount
* **Salary Change** — effective month, description, new monthly income

All added events appear together in a single sortable timeline table, with the option to remove any of them.

## Step 5: Instruments

Add any existing Fixed Deposits and Recurring Deposits:

* **Fixed Deposit** — name, principal, rate (0–15%), duration (1–120 months), start month
* **Recurring Deposit** — name, monthly contribution, rate, duration, start month

You can add multiple FDs/RDs and remove any before moving on.

## Step 6: Review & Generate

Review a summary of everything you've entered — start month, duration, income, expenses, opening cash, number of investment accounts, number of events, and FD/RD counts — alongside the generated configuration (viewable as JSON, and exportable).

Click **Generate Forecast** to build your plan and switch to the Forecast view.

# 4. Managing Investment Accounts

Investment Accounts are independent portfolios, each growing separately according to its own contribution and return schedule.

Examples:

* Index Fund
* US Stocks
* NPS
* Retirement Portfolio

## Monthly Contributions

Monthly contributions are automatically added every month.

Example:

```text
Monthly Contribution: ₹5,000
```

The planner invests ₹5,000 into that account every month.

## Deposits

A deposit adds a one-time amount to an account on a chosen month.

Example:

```text
March 2028
Deposit ₹50,000
```

This immediately increases the account balance.

## Withdrawals

Withdrawals remove money from an account on a chosen month. Withdrawals cannot exceed the available account balance.

## Amount Overrides

Amount Overrides temporarily change the monthly contribution for a date range.

Example:

```text
Default SIP: ₹5,000

Jan 2028 - Dec 2028
Override SIP: ₹10,000
```

During the override period, ₹10,000 is invested monthly. After the override ends, the account automatically returns to its default contribution.

## Return Overrides

Return Overrides temporarily change the expected annual return for a date range.

Example:

```text
Default Return: 12%

Jan 2029 - Dec 2029
Override Return: 8%
```

Only the selected period uses the override.

## The Account Schedule Timeline

Open an account's row in the **Investment Accounts** view to see its full contribution and return history as a visual, segmented timeline. Every segment is explicitly labeled — there's never any guessing based on color alone:

* **Default Contribution** / **Default Return** — your account's baseline settings
* **Amount Override** / **Return Override** — a scenario override active during that range

Each override segment has **Edit** and **Delete** actions right on the timeline, so you can adjust or remove it without leaving the account's detail view. The same panel also shows **Total Contributions** and **XIRR**.

## Account Provenance ("Added" Badge)

Accounts that were part of your original Base Plan are shown normally. Any account created later — during a scenario — is marked with a green **"Added"** badge, so you can always tell what's new versus what you started with. The Scenario Banner also summarizes how many new accounts exist (see [The Scenario Lab](#7-the-scenario-lab)).

## Deleting Accounts

Accounts can be deleted from the **Investment Accounts** view — both original accounts and ones created later.

Deleting an account requires confirmation, and immediately:

* Removes the account itself
* Removes its **Amount Overrides**
* Removes its **Return Overrides**
* Removes its **Deposits**
* Removes its **Withdrawals**
* Re-runs the forecast with the change applied

Deletion does not affect whether an account counts as part of your "original plan" for provenance purposes — that history is preserved independently.

# 5. Fixed Deposits (FD)

FDs are one-time deposits that mature after a fixed period.

Each FD contains:

* Principal
* Interest Rate
* Start Month
* Duration

At maturity:

* Principal is returned
* Interest is added
* Cash balance increases automatically

FD creation requires sufficient available cash (see [Understanding Overrides](#9-understanding-overrides) for how this is calculated).

# 6. Recurring Deposits (RD)

RDs invest money every month for a fixed duration.

Each RD contains:

* Monthly Contribution
* Interest Rate
* Start Month
* Duration

At maturity:

* Contributions accumulate
* Interest is applied
* Funds return to cash automatically

Interest is **compounded quarterly** — the standard method Indian banks (e.g. HDFC) use — so an RD's projected maturity value lines up with what a bank's RD calculator shows.

RD creation requires sufficient available cash to sustain the first monthly contribution.

# 7. The Scenario Lab

The Scenario Lab is the sidebar (or drawer, on mobile) where you build and manage your active scenario. It has **six sections**, arranged in a 2 × 3 grid:

## Expenses

Add modifications that affect outflows:

* **Expense** — one-off expense for a single month
* **Recurring** — a named expense charged monthly or annually over a date range
* **Credit card** — a single credit-card payment for a chosen month
* **Spending Override** — replace your baseline monthly spend with a different amount for a date range (see [Spending Override](#spending-override))

## Cash

Add modifications that affect income or the opening cash balance:

* **Salary change** — set a new monthly income from a chosen effective month
* **Bonus** — add one-time bonus income in a chosen month
* **Opening Cash** — replace the starting cash balance for this scenario (see [Opening Cash Override](#opening-cash-override))

## Investments

Create a new investment account, or add an Amount Override, Return Override, Deposit, or Withdrawal against an existing account.

## FD

Create a new Fixed Deposit for the scenario.

## RD

Create a new Recurring Deposit for the scenario.

## Events

A single, categorized list of **every active modification** in your current scenario — grouped by **Cash Events**, **Expenses**, **Investments**, **FD**, and **RD**. Each entry can be edited or deleted directly. Investment-related events are further grouped by account.

## The Scenario Banner

Whenever you have an active scenario, a banner appears above the dashboard summarizing it:

* A count of total modifications — click it to jump to the **Events** section, showing everything
* A colored badge per event type (e.g. "Deposit ×2", "Spending Override ×1") — click a badge to jump to the Events section filtered to just that type (use **Show all** to clear the filter)
* A green **"New account ×N"** badge if your scenario has created new investment accounts (informational only)

## Resetting

The **Reset** button in the Scenario Lab clears all active scenario modifications and returns you to your unmodified Base Plan. Your Base Plan itself is never changed by scenario activity.

# 8. Scenario Planning

Scenario Planning allows you to test alternate futures.

## Cash Event Scenarios

Examples:

* Salary Increase
* Salary Reduction
* Bonus Income
* **Start the scenario with more cash** — e.g. model receiving a lump sum before the forecast begins
* **Start the scenario with less cash / in debt** — Opening Cash Override accepts negative values

## Expense Scenarios

Examples:

* Medical Emergency
* New Vehicle Purchase
* Home Renovation
* Annual Recurring Expenses (e.g. insurance premiums, property tax)
* **Higher living costs for a period** — e.g. model ₹40,000/mo baseline rising to ₹60,000/mo for 2028 using a Spending Override
* **Lower living costs for a period** — e.g. model reduced spending after a lifestyle change

## Investment Scenarios

Examples:

* Create Investment Account
* Deposit Into Account
* Withdraw From Account
* Amount Override
* Return Override
* Delete Account

## Deposit Scenarios

Examples:

* Create FD
* Create RD

## Recurring Expenses: Monthly vs. Annual

When adding a recurring expense (in the Builder or the Scenario Lab), choose:

* **Monthly** — define a Start Month and End Month; the amount is charged every month in that range.
* **Annual** — define a Start Month and a **Number of Years**; the amount is charged once per year, on the anniversary of the start month, for that many years.

The number of years you can choose is capped by how much of the forecast horizon remains from the start month. If fewer than 12 months remain, Annual isn't available for that start month and you'll see an explanatory message. Choosing more years than fit in the remaining horizon is also blocked.

# 9. Understanding Overrides

Overrides temporarily replace default behavior.

## Amount Override

Changes:

```text
Monthly Contribution
```

for a selected period.

## Return Override

Changes:

```text
Expected Annual Return
```

for a selected period.

## Spending Override

A **Spending Override** replaces your baseline monthly spend (`defaultMonthly`) with a different amount for a chosen date range.

Key points:

* **Replacement, not addition.** The override amount *becomes* your baseline spend for that period — it does not add to it.
* **Additive items still stack.** Recurring expenses, credit-card bills, and one-off expenses are unaffected and continue to layer on top of the overridden baseline.
* **Non-overlapping ranges only.** Two spending overrides cannot cover the same month. The form will warn you before you try.
* **Edit later.** You can update the amount from the **Events** tab. To change the date range, delete and recreate.

Example:

```text
Baseline: ₹40,000/mo

Spending Override: Jan 2028 → Dec 2028
Override Amount:  ₹60,000/mo

Effect:
  Jan–Dec 2028: baseline becomes ₹60,000/mo
  All other months: ₹40,000/mo (unchanged)
```

## Opening Cash Override

An **Opening Cash Override** replaces the starting cash balance for the current scenario.

Key points:

* **Singleton.** Only one opening cash override can be active at a time. Adding a new value automatically replaces the previous one.
* **Negative values are allowed.** Use a negative amount to model starting in debt or overdraft.
* **Replacement, not additive.** The override value becomes the scenario's opening balance; the base plan's opening balance is ignored for the scenario.
* **All downstream values recompute.** Cash balances, lowest-cash projection, net worth, and available-cash limits for FD/RD/deposits all update immediately to reflect the new opening balance.

Example:

```text
Base Plan Opening Cash: ₹500,000

Opening Cash Override: ₹200,000

Effect: the scenario starts with ₹200,000 instead of ₹500,000
```

Negative example:

```text
Opening Cash Override: -₹50,000

Effect: the scenario starts ₹50,000 in debt — the planner models this as an overdraft and surfaces the impact on all future cash flows.
```

## Available Cash & Spending Limits

Investment Deposits, FD creation, and RD creation are all capped by the same **available cash** figure: your projected cash balance at the chosen month, from the *full, unfiltered* forecast (the month-range filter never affects this check). Every form shows "Available cash at <month>: ₹X" next to the amount field, and won't let you submit more than that.

## Overlap Protection

Overrides for the same account cannot overlap.

Example:

```text
Jan - Jun
₹5,000

Apr - Dec
₹10,000
```

This is not allowed. Create non-overlapping ranges instead.

# 10. Filtering by Month Range

A single **month-range filter** ("From" / "To") sits above the dashboard, near the top of the Forecast view.

* Setting it narrows the net worth chart and every time-series table/timeline (Forecast, Cashflow, Net Worth, Timeline, Investment Timeline) to that window simultaneously.
* Clearing it restores the full forecast horizon everywhere.
* It does **not** affect the Investment Accounts view, or the available-cash checks used when creating Deposits, FDs, or RDs — those always reflect your full plan.

This is the only month-range control in the app — no individual tab or chart has its own separate filter.

# 11. Dashboards & Reports

The dashboard offers eight tabs, all (except where noted) respecting the month-range filter above.

## Forecast Table

Month-by-month projections showing:

* Cash
* Investments
* Net Worth

## Cashflow Table

Shows:

### Inflows

* Salary
* Bonuses
* Withdrawals
* Maturities

### Outflows

* Expenses
* Investments
* FDs
* RDs

## Net Worth Table

Displays asset growth over time.

## Instruments

A consolidated list of every FD and RD, showing type, rate, duration, start month, maturity month, principal, interest earned, and maturity value.

## One-Offs

A list of every one-off expense, with its month and amount.

## Timeline

Displays all financial events chronologically, with category filter chips.

## Investment Timeline

A read-only visual timeline of investment-related activity only:

* Deposits
* Withdrawals
* Amount Overrides
* Return Overrides

## Investment Accounts

Shows, per account:

* Current Value
* Contribution & Return Schedule Timeline (with explicit labels and editable overrides)
* Total Contributions
* XIRR
* Provenance ("Added" badge) and Delete action

# 12. Saving, Importing & Exporting

## Your Profile & Cloud Saves

Open your **Profile** from the avatar in the top-right corner. It shows your email, the date you joined ("Member since"), and your cloud saves.

Cloud saves let you store complete plans against your account and reach them from any device. You can keep up to **5 saves**.

**Save the current plan**

1. In the Profile, choose **Save current plan**.
2. Pick **New save** and give it a label (e.g. "5-year conservative plan"), or **Overwrite existing** to replace one of your saves in place.
3. Each save also records a snapshot of its **final net worth** and **forecast length**, shown on the save card.

**When you sign in**

Your **most recent save loads automatically** and opens the Forecast. If you've never saved anything, you start on an empty Plan Builder. If the cloud can't be reached at sign-in, a banner lets you retry — you won't be left stranded.

**Per save, you can:**

* **Load** it into the app. If your current plan has **unsaved changes**, Worth Flow asks for confirmation first so you don't lose work.
* **Download** it as a `.wfplan` file.
* **Delete** it (with confirmation).

> Your saves are private to your account — no one else can see or access them.

## Save Scenario

Save the current scenario configuration for later use. You can create multiple saved scenarios and switch between them instantly. (This is separate from cloud saves above: scenarios live inside a plan; cloud saves store the whole plan.)

## Export Plan

Exports a `.wfplan` file containing:

* Base Plan
* Active Scenario
* Saved Scenarios

Useful for:

* Backup
* Sharing
* Archiving

## Import Plan

Restores a previously exported `.wfplan` file. Imported plans are validated before loading.

# 13. Data & Privacy

* **All forecasting happens in your browser.** There is no server doing the math — your numbers are computed locally.
* **Accounts** are handled by Amazon Cognito. Worth Flow never stores your password.
* **Cloud saves** are written directly to private storage scoped to your account. Only you can read your saves — no other user, and not the app itself.
* **While you work**, your current plan is also kept in your browser's local storage so a refresh doesn't lose it. **Signing out clears it** from the browser, so nothing of yours remains on a shared computer.
* **Exporting** a plan produces a `.wfplan` file you fully control — use it to back up your data or move it elsewhere. Downloaded cloud saves use the same format.

# 14. Frequently Asked Questions

## I didn't receive my verification / reset email — what now?

First check your spam folder. If it's still missing, use **Resend code** on the verification screen. Codes expire after a short while, so request a fresh one if too much time has passed.

## I signed up but never entered the code. Am I locked out?

No. Start sign-up again with the same email, or just sign in — Worth Flow detects the pending account, sends a new code, and returns you to the verification screen to finish.

## How many plans can I save to the cloud?

Up to **5** per account. To make room, delete or overwrite an existing save from your Profile.

## What's the difference between a cloud save and a saved scenario?

A **saved scenario** is a set of "what if" modifications stored *inside* a plan. A **cloud save** stores an *entire plan* (base plan + scenarios) against your account so you can reload it on any device.

## Why was I asked to confirm before loading a save?

Because your current plan had **unsaved changes**. Loading replaces the current plan, so Worth Flow checks first. If you'd already saved (or hadn't made changes), it loads without asking.

## Why does an FD require available cash?

Because creating an FD moves money out of cash.

## Why does an RD require available cash?

The planner ensures monthly RD commitments remain realistic.

## Why can't I withdraw more than my account balance?

Withdrawals are restricted to available funds in that account.

## Why can't overrides overlap?

Overlapping overrides create ambiguous contribution or return assumptions.

## What happens to provenance if I delete and re-add an account?

`baselineAccountIds` answers "was this part of my *original* plan?", not "does this account currently exist?". Deleting an account doesn't rewrite that history — a re-added account with a new ID would be treated as new, the same as any other scenario addition.

## What is XIRR?

XIRR is the annualized return that considers:

* Contributions
* Deposits
* Withdrawals
* Timing of cash flows

It is generally more accurate than simple return percentages.

## What does Lowest Cash mean?

Lowest Cash is the minimum projected cash balance reached during the forecast.

This helps identify future liquidity problems before they occur.

## Does a Spending Override affect recurring expenses?

No. A Spending Override only replaces the *baseline* monthly spend (`defaultMonthly` from your Base Plan). Recurring expenses, credit-card bills, and one-off expenses continue to stack on top of the overridden amount, exactly as they would without the override.

## Can two Spending Overrides cover the same months?

No — overlapping ranges are blocked. The form will show a warning and disable the submit button if your chosen range overlaps an existing override. To change an existing range, delete it and create a new one with the desired dates.

## Can an Opening Cash Override be negative?

Yes. A negative opening cash balance models starting the scenario in debt or overdraft. All projected cash flows, the lowest-cash figure, and available-cash limits for FD/RD/deposit creation all reflect this adjusted starting point correctly.

## What happens if I add a second Opening Cash Override?

Only one Opening Cash Override can be active at a time. Adding a new value silently replaces the previous one (you'll see a yellow warning in the form when an existing override is present). The old value is removed; the new value takes effect immediately.

**Tip:** Start with a simple plan first. Add scenarios gradually and compare results to understand which decisions have the biggest impact on your future finances.
