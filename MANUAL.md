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
14. AI Assistant
15. Frequently Asked Questions

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

You can switch between "Build Plan" and "Forecast" at any time using the tabs at the top of the app. Re-running the builder generates a brand-new plan. If you have active Scenario Lab changes, opening **Build Plan** asks whether to **Start from base** (the baseline only) or **Keep my edits** (fold your changes into the builder so you can turn them into a new base plan). A few things can't carry over — the builder captures your baseline only, so date-range overrides (spending, contribution, return) and investment deposits/withdrawals are left behind.

## Guided Tours

Two short walkthroughs highlight the main features. The **Forecast tour** runs automatically the first time you generate a plan, and the **Scenario Lab tour** steps through every tab of the Lab. You can replay either one at any time from the **Tutorials** menu, opened with the **?** button in the header next to the theme toggle.

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

Scenarios let you explore possibilities on top of the Base Plan. A **saved scenario** is a named snapshot of your *currently active* changes, kept **inside your plan** — not a separate file. Saving, exporting, or importing always captures the whole plan as one snapshot (base plan + the changes currently active + every saved scenario), so a reloaded plan comes back in exactly the same condition. **Reset** clears the active changes and restores the baseline.

## Forecast Horizon

The forecast horizon determines how far into the future the planner will simulate, set when building your plan.

Examples:

* 12 Months
* 24 Months
* 36 Months
* 48 Months

All charts, reports, and projections are generated within this period. Annual recurring expenses and available-cash checks are also bounded by this horizon (see [Scenario Planning](#8-scenario-planning) and [Understanding Overrides](#9-understanding-overrides)).

# 3. The Plan Builder

The Plan Builder is a six-step wizard that produces your Base Plan. Each step must be completed before moving to the next. Anything you add (an account, an instrument, an event) can be **edited** later from its pencil icon, which opens a small form in a modal, or removed with the trash icon.

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

You can add, edit, and remove accounts. An account whose start month falls outside the forecast window is flagged **Outside window** so you can fix it before generating.

## Step 4: Events

Add any known future events that should be part of your Base Plan, across five categories:

* **One-Off Expense** — month, label, amount
* **Recurring Expense** — name, amount, and either **Monthly** (Start Month + End Month) or **Annual** (Start Month + **How many times?**) frequency
* **Credit Card Bill** — month, label, amount
* **Bonus Income** — month, description, amount
* **Salary Change** — effective month, description, new monthly income

All added events appear together in a single sortable timeline table, with the option to edit or remove any of them. An event that falls outside the forecast window is flagged **Outside**.

## Step 5: Instruments

Add any existing Fixed Deposits and Recurring Deposits:

* **Fixed Deposit** — name, principal, rate (0–15%), duration (1–120 months), start month
* **Recurring Deposit** — name, monthly contribution, rate, duration, start month

You can add, edit, and remove FDs/RDs. Unlike accounts and events, an FD or RD may start before the forecast window; only the cashflow and maturity that land inside the window are counted.

## Step 6: Review & Generate

Review a summary of everything you've entered — start month, duration, income, expenses, opening cash, number of investment accounts, number of events, and FD/RD counts — alongside the generated configuration (viewable as JSON, and exportable).

Click **Generate Forecast** to build your plan and switch to the Forecast view.

If any investment account or event falls **outside the forecast window** (for example after you change the start month or horizon on Step 1), Generate Forecast and Export are disabled and a **Move all into the window** button appears. One click pulls every stray item to the first month; you can also fix items individually with their pencil icon. FDs and RDs are exempt from this check.

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

Interest is **compounded quarterly** — the standard method Indian banks (e.g. HDFC) use — so an FD's projected maturity value lines up with what a bank's FD calculator shows.

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

The Scenario Lab is where you build and manage your active scenario. Open it from the menu button (☰) in the header: it slides in as a sidebar on desktop and a full-screen drawer on mobile, staying collapsed otherwise so your forecast uses the full screen width. It has **six sections**, arranged in a 2 × 3 grid:

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
* **Undo** and **Redo** buttons that step back and forth through your scenario changes one at a time. They work on *every* kind of change (events, account creation/removal, AI-applied changes), and the history travels with your plan — so undo/redo behaves identically on any device once you reload a saved plan. Starting a new change after an undo clears the redo trail, **Reset** clears the history entirely, and loading a saved scenario starts a fresh timeline: your changes carry over, but the undo history resets so you never step back into a different scenario's edits.
* A colored badge per event type (e.g. "Deposit ×2", "Spending Override ×1") — click a badge to jump to the Events section filtered to just that type (use **Show all** to clear the filter)
* A green **"New account ×N"** badge if your scenario has created new investment accounts (informational only)
* A red **"Removed base acc ×N"** badge if your scenario has deleted any of your original (base) accounts — a reversible what-if, restored by **Reset**

## Resetting

The **Reset** button in the Scenario Lab restores your plan to its last loaded/saved baseline: it clears every active scenario modification *and* removes any investment accounts you created during the scenario (and brings back any baseline account you deleted).

An account you create in the Scenario Lab is a **what-if**: it travels with the plan when you save or export (reloading the plan brings it back), but it is **not** part of your base plan, so **Reset always clears it** — even after a save. To make an account a permanent part of your base plan, add it in the **Plan Builder** instead.

Deleting one of your **original (base) accounts** is also a reversible what-if: your base plan keeps the account, the scenario simply hides it (and its overrides, deposits, and withdrawals), and **Reset** brings it back. The Scenario Banner flags it as **"Removed base acc ×N"**.

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

The number of years you can choose is capped by how many yearly charges fit inside the forecast: a charge lands on each anniversary of the start month, and every charge must fall within the horizon — only the charge months need to fit, not a full trailing year. So Annual is available from any start month in the window (down to a single charge in the final month), and choosing more years than fit is blocked with an explanatory message.

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

* Account creation (each account is marked in the month it opens, with its opening balance)
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

Save the current scenario configuration for later use. You can create multiple saved scenarios and switch between them instantly; each one shows how it moves the needle against your base plan — **Net Worth Δ**, **Cash Δ**, and **Investments Δ**. (This is separate from cloud saves above: scenarios live inside a plan; cloud saves store the whole plan.)

## Export Plan

Exports a `.wfplan` file containing:

* Base Plan
* Active Scenario
* Saved Scenarios
* Undo/redo history (so the scenario timeline is identical after you re-import)

Useful for:

* Backup
* Sharing
* Archiving

## Import Plan

Restores a previously exported `.wfplan` file. Imported plans are validated before loading. If a loaded or imported plan has any investment account or event that falls **outside its forecast window** (for example, after its start month was moved), it opens in the **Builder** with a notice so you can bring those items back into range and regenerate — rather than showing a forecast built on out-of-range data.

# 13. Data & Privacy

* **All forecasting happens in your browser.** There is no server doing the math — your numbers are computed locally.
* **Accounts** are handled by Amazon Cognito. Worth Flow never stores your password.
* **Cloud saves** are written directly to private storage scoped to your account. Only you can read your saves — no other user, and not the app itself.
* **While you work**, your current plan is also kept in your browser's local storage so a refresh doesn't lose it. **Signing out clears it** from the browser, so nothing of yours remains on a shared computer.
* **Exporting** a plan produces a `.wfplan` file you fully control — use it to back up your data or move it elsewhere. Downloaded cloud saves use the same format.

# 14. AI Assistant

Worth Flow includes an optional AI assistant powered by **Google Gemini** (free and paid models). You bring your own API key — Worth Flow never has access to it.

## How it works

The assistant is given a grounded summary of your current forecast — headline totals, pre-computed aggregates (most expensive month, biggest cash dips, per-year totals), a month-by-month series, and your accounts, FDs/RDs, and active scenario. Every number it quotes comes straight from the engine, never the model's own arithmetic. It cannot see your credentials, internal IDs, or raw configuration. It can also propose a plan change you confirm before it's applied. All inference runs between your browser and Gemini; no data passes through Worth Flow's infrastructure.

## Setting up your key

1. Get a **Gemini** key from [Google AI Studio](https://aistudio.google.com) — a free-tier key is enough. Worth Flow never has access to your key.
2. Open the **Forecast** view and click the floating **sparkle (✦)** button in the bottom-right corner to open the AI panel.
3. Click **Set up your AI key**, pick your model (Flash is free; Pro needs Google billing), and paste your key.
4. Choose an **AI passphrase** (at least 8 characters). This is separate from your account password — Worth Flow uses it to encrypt the key and your chat before storing them.
5. Confirm the passphrase and click **Encrypt & Save Key**.

Your key is encrypted in your browser before it is saved. Worth Flow's cloud storage holds only the encrypted form and cannot read it.

## Restricting your key (recommended)

In Google AI Studio, you can limit your key's blast radius:

* Restrict it to the **Generative Language API** only.
* Add an **HTTP referrer restriction** to your app's origin.
* Use a **dedicated key** for Worth Flow so you can revoke it independently without affecting other projects.

## Asking questions

Once your key is set up and unlocked, type a question in the chat box and press **Enter** (use **Shift+Enter** for a new line). The assistant streams its reply in real time, formatted with **bold** figures, lists, and tables for easy reading. While a reply is streaming you can press the **Stop** button to end it early; closing the panel also stops it.

Every figure the assistant quotes comes directly from Worth Flow's simulation engine — it never computes or estimates numbers itself, so its answers always match your forecast.

Good starting questions:

* "When does my cash reach its lowest point, and why?"
* "What's my heaviest month, and what's driving it?"
* "Break down my expenses for September 2028."
* "Which account contributes most to my net worth by the end of the forecast?"
* "What would happen if I reduced expenses by ₹10,000/month from next year?"
* "Summarise my FD maturities for the next two years."

The assistant sees your forecast month by month, including each month's spending split into baseline, one-off, recurring and credit-card amounts and the money you put into investments, along with the names of the expenses and income behind them. That lets it not just tell you which month is heaviest but name what makes it heavy.

## Suggesting changes to your plan

Beyond answering questions, the assistant can **propose a change** to your scenario that you apply with one click — it never edits your plan on its own.

1. Type what you'd like to try (e.g. *"Add a ₹2,00,000 one-off expense in March 2028"*, *"Create an FD of ₹5 lakh next month"*, or *"Change my spending override to ₹50,000"*).
2. Click the **wand (✨ "Suggest a change")** button — or just **Send** a clear instruction and the assistant treats it as a change automatically. It recognises a leading action verb (*create, add, delete, remove, destroy, set, start, open, deposit, withdraw, change*) or a first-person intent (*"I want to add…"*, *"I'd like you to create…"*). Questions stay normal chat — anything ending in "?" or starting with *can / could / should / how / what / when* (e.g. *"Can I start an FD?"*). If a recognised change still needs a detail — an FD's rate, say — it asks, and warns up front if the amount won't fit that month.
3. The assistant replies with a **proposed-change card** showing:
   * a plain-language summary of exactly what it would do;
   * an **estimated impact** — how your lowest projected cash and final net worth would change (a preview that does **not** touch your plan);
   * **Apply** and **Dismiss** buttons.
4. If a change *can't* be applied — say, an FD bigger than your available cash, or a spending override that overlaps an existing one — the card **flags it up front** with the reason and disables **Apply**, so you never hit a dead end. Adjust your request and try again.
5. **Apply** makes the change through the *same checks the Scenario Lab uses*. It then appears in your Scenario Banner and Events list like any other scenario edit, and the card shows an **Applied** badge.
   * To roll it back, use **Undo** in the Scenario Banner (the same undo/redo that covers all scenario changes) — or remove it directly in the Events list.
   * The **Applied** badge is read from your actual plan, not the chat, so it always matches what's really in the plan in front of you — even across devices. Applying the same suggestion twice never double-counts it, and if you've since changed your plan so the suggestion no longer fits, **Apply** shows a clear error instead of doing anything.
   * A **new investment account** appears in **Investment Accounts** with an "Added" badge — remove it there, or clear it with **Reset** (it's a what-if, not part of your base plan).
6. **Dismiss** discards the suggestion; nothing changes.

### What it can do

The assistant can exercise the whole Scenario Lab, always within the same guardrails as the manual forms:

* **Add** one-off, recurring and credit-card expenses; bonuses and salary changes; spending and opening-cash overrides; FDs and RDs; investment deposits and withdrawals; a new investment account; and contribution or return overrides on an account.
* **Edit** an existing scenario change (e.g. its amount, month, rate, or duration).
* **Remove** an existing scenario change.

It works on **one change at a time** — if you ask for several at once, it'll say so and ask which to do first. It **can't** delete an investment account, switch views, or save/load — those stay in your hands. And it can never exceed a real limit (you can't, for instance, fund an FD or deposit beyond the cash available that month).

## Passphrase and security

**There is no passphrase reset.** If you forget your AI passphrase, you must use **Forgot passphrase** (available in Key Settings) to start fresh — this permanently erases your saved key and chat, and you will need to re-enter your AI provider API key and choose a new passphrase. Your financial plan is not affected.

Your chat is encrypted with the same passphrase-derived key as your API key. Only you can decrypt it — not even Worth Flow.

## Using the assistant across devices

Your encrypted key and chat are synced to your personal cloud storage. When you sign in on another device, unlock the AI panel with your passphrase; the key and your conversation are fetched and decrypted locally.

## Removing the AI key

Open **Key Settings** (three-dot menu in the AI panel) and choose **Remove key & chat**. This deletes both the stored key and your chat history permanently. The AI panel will revert to setup mode.

# 15. Frequently Asked Questions

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

Lowest Cash is the **lowest your cash balance dips at any point within a month** across the whole
forecast — the conservative liquidity low. Because it captures *intra-month* movements, it can be
lower than every month-end figure you see in the tables: e.g. a month where a recurring
contribution goes out before an FD/RD matures *that same month* dips mid-month, then recovers by
the closing balance. The Cash card's tooltip notes this. It helps you spot future liquidity
pinch-points before they occur.

## Does a Spending Override affect recurring expenses?

No. A Spending Override only replaces the *baseline* monthly spend (`defaultMonthly` from your Base Plan). Recurring expenses, credit-card bills, and one-off expenses continue to stack on top of the overridden amount, exactly as they would without the override.

## Can two Spending Overrides cover the same months?

No — overlapping ranges are blocked. The form will show a warning and disable the submit button if your chosen range overlaps an existing override. To change an existing range, delete it and create a new one with the desired dates.

## Can an Opening Cash Override be negative?

Yes. A negative opening cash balance models starting the scenario in debt or overdraft. All projected cash flows, the lowest-cash figure, and available-cash limits for FD/RD/deposit creation all reflect this adjusted starting point correctly.

## What happens if I add a second Opening Cash Override?

Only one Opening Cash Override can be active at a time. Adding a new value silently replaces the previous one (you'll see a yellow warning in the form when an existing override is present). The old value is removed; the new value takes effect immediately.

**Tip:** Start with a simple plan first. Add scenarios gradually and compare results to understand which decisions have the biggest impact on your future finances.
