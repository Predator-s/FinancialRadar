# 💰 Bytex Ledger — The "Smart" Mini-Ledger

A lightweight, full-stack financial ledger. Add, categorize, and review income &
expense transactions, see a live summary, and get **automatic notifications** —
including a genuinely-smart feature that flags unusual spending before you notice
it yourself.

Built for the **Bytex Challenge**. This README is deliberately detailed about
*where AI helped* and, more importantly, *where AI was wrong and human
engineering judgment had to step in* (see [§7](#7-ai-tools--the-honest-story)).

---

## 1. Quick start

**Prerequisites:** Node.js 18+ (tested on Node 25). No database server, no
Docker, no cloud accounts required.

```bash
# from the project root (BytexLedger/)
npm run install:all     # installs backend + frontend deps
npm run seed            # loads realistic demo data (incl. one planted outlier)

# then run the two processes (two terminals is clearest):
npm run backend         # API  → http://localhost:4000
npm run frontend        # UI   → http://localhost:5173
```

Or start both at once:

```bash
npm run dev             # seeds, then runs API + UI together
```

Open **http://localhost:5173**. The seed data already contains a planted
anomaly (a ₹4,200 dinner among many ₹150–₹400 food spends), so the Financial
Radar and the 🔔 notification are populated on first load.

---

## 2. What it does (feature tour)

| Area | Details |
|---|---|
| **Transactions** | Add income/expense with amount, category, date, note. Type-aware category lists, delete, and live filtering by type/category. |
| **Summary** | Balance, total income, total expense, and a **savings-rate %**. |
| **Data viz** | A **running-balance area chart** (cumulative, not noisy daily bars) and a **spend-by-category** donut with live percentages. |
| **Notifications** | A **rules engine** (`rules.js`) that auto-triggers alerts — unusual spend, monthly-budget breach, low runway, negative balance — plus a pluggable notifier that persists every alert and fans out to multiple channels (console + optional webhook + email stub). In-app bell with unread badge, mark-as-read, and an on-demand **ledger digest**. See [§6](#6-notifications--rules--any-medium). |
| **The Unique Twist** | The **Financial Radar** → real-time anomaly detection + burn-rate runway forecast. See [§4](#4-the-unique-twist-the-financial-radar). |

---

## 3. Architecture

```
BytexLedger/
├── backend/                 # Node + Express API (ES modules, zero native deps)
│   └── src/
│       ├── server.js        # app wiring, CORS, JSON, error handler
│       ├── store.js         # atomic JSON persistence behind a repository interface
│       ├── routes/          # transactions.js, notifications.js
│       └── services/
│           ├── radar.js     # ⭐ anomaly detection + burn-rate (the twist)
│           ├── summary.js   # aggregations for the dashboard
│           ├── notifier.js  # pluggable multi-channel dispatch
│           ├── validate.js  # centralised input validation
│           └── categories.js # category lists + NL category guesser
├── frontend/                # Vite + React + Recharts
│   └── src/
│       ├── App.jsx          # state + data flow
│       ├── api.js           # thin fetch client
│       └── components/      # SummaryCards, RadarPanel, AddTransaction,
│                            # TransactionList, Charts, NotificationBell
└── package.json             # root convenience scripts
```

**Design principles**

- **One seam for persistence.** Every read/write goes through `store.js`. Nothing
  else touches disk, so swapping the JSON store for SQLite/Postgres is a
  single-file change — the routes and services never know the difference.
- **Validation is centralised**, not sprinkled across routes, so every write
  enforces identical rules and error shapes.
- **Notifications never break writes.** A failing channel (e.g. a dead webhook)
  is swallowed per-channel; the ledger write that triggered it always succeeds.

### API reference

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | liveness check |
| `GET` | `/api/categories` | valid income/expense categories |
| `GET` | `/api/rules` | notification rule catalogue + thresholds (self-documenting) |
| `GET` | `/api/transactions` | list (filters: `type`, `category`, `from`, `to`) |
| `POST` | `/api/transactions` | create — runs the rules engine, dispatches any triggered notifications |
| `DELETE` | `/api/transactions/:id` | delete |
| `GET` | `/api/summary` | totals, category breakdown, balance trend, **runway** |
| `POST` | `/api/parse` | natural-language parse (`"coffee 250"` → draft) |
| `GET` | `/api/notifications` | list + unread count + active channels |
| `POST` | `/api/notifications/:id/read` · `/read-all` | mark read |
| `POST` | `/api/notify` · `/notify/digest` | send a custom alert / a ledger digest |

---

## 4. The Unique Twist: the "Financial Radar"

An AI-generated ledger stops at CRUD + a pie chart. The Radar is the part a
boilerplate generator wouldn't suggest, and it's built from two ideas:

### 4a. Real-time anomaly detection (`services/radar.js`)

When you log an **expense**, it's compared against the history of *that same
category*. If it's a statistical outlier, the transaction is flagged **and a
notification fires automatically** — tying the "notifications" requirement to
something genuinely useful instead of a toy "you added a row" ping.

**The non-obvious engineering choice:** I did **not** use the textbook
mean + standard-deviation z-score. On real spending data a single huge purchase
poisons the mean *and* inflates the std, which then *hides the next outlier* —
the detector goes blind exactly when it matters. Instead the Radar uses the
**modified z-score (median + MAD)** from Iglewicz & Hoaglin:

```
modified_z = 0.6745 × (amount − median) / MAD
```

MAD (median absolute deviation) is resistant to outliers, so one splurge doesn't
desensitise the detector. Edge cases handled explicitly:

- **Too little history** (< 4 samples) → stay silent rather than cry wolf.
- **Flat history** (MAD = 0, all past values identical) → fall back to a 3× ratio
  test so we still catch a wild spend.
- Only **over-spends** are flagged (a small expense is never an "anomaly").

### 4b. Burn-rate runway forecast

From the trailing-30-day net cash flow, the Radar projects **how many days your
current balance will last** — a forward-looking answer, not just a backward-
looking balance. It classifies the result as *healthy / watch-out / critical*
and explicitly handles the "you're actually saving money" case (**infinite
runway — no divide-by-zero**), which a naive `balance / dailySpend` would crash on.

### 4c. Natural-language quick-add (bonus)

Type `coffee 250` or `uber ride 480` and the app parses the amount and **guesses
the category** via keyword rules, pre-filling the form for you to confirm.

---

## 5. Production polish

- **Robust validation** — rejects non-positive/NaN/absurd amounts, future dates,
  categories that don't match the chosen type, over-long notes; money is
  normalised to 2 decimals server-side.
- **Error handling everywhere** — malformed JSON → clean `400`; unknown routes →
  `404`; a central error handler prevents stack traces leaking; the frontend
  shows a friendly banner if the API is down and inline errors on bad input.
- **Crash-safe persistence** — writes are atomic (write-temp-then-`rename`) and a
  corrupt data file degrades gracefully instead of taking down the API.
- **Clean, responsive UI** — a bespoke light **"Butter & Green"** theme (butter
  `#ffefb3` canvas, warm-white cards, deep-green `#013e37` ink, and green primary
  buttons with butter labels; income/expense and chart colours are derived shades
  tuned to read on the light surface), a consistent modern icon set (lucide-react
  SVGs, no emoji/images), empty states, loading state, toasts, hover affordances,
  and a layout that collapses to one column on mobile. All colours live as CSS
  custom properties in one `:root` block, so re-theming is a single-file change.

---

## 6. Notifications — rules & "any medium"

### When a notification triggers (the rules engine)

All trigger logic lives in one place — `services/rules.js`, a small **rules
engine**. On every `POST /api/transactions` it compares the ledger *before* vs
*after* the new transaction and returns the alerts to raise. The route just
dispatches them, so adding a rule is a one-function change. The live catalogue
is served at `GET /api/rules`.

| Rule | Fires when | Type |
|---|---|---|
| **Unusual spend** | an *expense* is a high statistical outlier for its category (modified z-score > 3.5, needs ≥ 4 prior samples) | `anomaly` |
| **Monthly budget exceeded** | the calendar-month expense total *first crosses* the budget cap (`MONTHLY_BUDGET`, default ₹50,000) | `budget` |
| **Low runway** | the burn-rate runway *first drops* to ≤ 14 days | `budget` |
| **Negative balance** | total balance *first goes* below zero | `budget` |

The budget/runway/balance rules are **transition-based** — they fire only on the
transaction that *crosses* the threshold, not on every expense afterwards, so
you get one alert instead of a stream of duplicates. If income later lifts you
back over the line, a subsequent crossing re-arms the rule. (Manual `POST
/notify` and the on-demand digest are also available.)

### How it's delivered ("any medium")

`services/notifier.js` is a small pub-sub over **channels**. Every notification
is persisted first (so the in-app bell always works), then fanned out to every
*enabled* channel:

- **console** — always on; delivery is visible in the API terminal.
- **webhook** — makes a real HTTP `POST` if `NOTIFY_WEBHOOK_URL` is set (works
  with Slack/Discord incoming webhooks). Proves the abstraction is real.
- **email** — stubbed (no SMTP creds in a demo) but shows exactly where a real
  transport (nodemailer/SES) slots in without touching callers.

```bash
# opt into a real external channel + a tighter budget:
NOTIFY_WEBHOOK_URL="https://hooks.slack.com/services/…" MONTHLY_BUDGET=30000 npm run backend
```

---

## 7. AI tools — the honest story

The challenge asks for this explicitly, so here it is without varnish.

### Which AI tools I used & how they accelerated the work

- **Claude Code (Anthropic)** was the primary tool. It scaffolded the Express
  server, the React component tree, the Vite config/proxy, the CSS design
  system, and the CRUD/validation boilerplate in minutes rather than hours.
- It was excellent at the **mechanical, well-trodden parts**: wiring routes,
  the fetch client, Recharts config, form state, and generating realistic seed
  data. Easily a 5–10× speed-up on that layer.

### Where the AI fell short — and how human judgment fixed it

1. **The AI's first instinct for anomaly detection was mean + standard
   deviation.** That's the "textbook" answer and it's *wrong for money*: one
   large purchase inflates both the mean and the std and blinds the detector to
   the next outlier. **Human fix:** switched to the outlier-resistant
   median + MAD modified z-score, and added explicit handling for the
   MAD-is-zero (flat history) and low-sample cases the AI never considered.

2. **The AI reached for `better-sqlite3` / an ORM by default.** On Node 25 that
   risks a native-module build failure on a fresh machine — the exact way a demo
   dies in front of a reviewer. **Human fix:** chose a dependency-free atomic
   JSON store behind a repository interface — bulletproof to run, and still
   swappable to SQLite because persistence is a single seam.

3. **The AI's happy-path code ignored the division-by-zero in the burn-rate**
   forecast (what happens when you're *saving*?). **Human fix:** treat
   cash-flow-positive as infinite runway and branch before dividing.

4. **AI-generated persistence did a naive `writeFileSync`** — a crash mid-write
   would corrupt the whole ledger. **Human fix:** write-to-temp-then-atomic-
   rename, plus a defensive loader that tolerates a partially-shaped/corrupt file.

5. **The AI let notification failures bubble up**, meaning a dead webhook could
   fail the transaction write that triggered it. **Human fix:** per-channel
   `allSettled` isolation so alerts are strictly best-effort side effects.

6. **Small hallucinations / rough edges:** the AI initially rendered the balance
   chart twice in two grid slots, generated a category-guesser that could return
   an income category for an expense, and produced `required` form fields without
   matching server-side checks. All caught and corrected during review and
   **verified in a real browser** (add → anomaly detected → notification fired →
   dashboard updated live).

**The through-line:** AI is a superb accelerator for the 80% that's boilerplate,
but the 20% that makes this "smart" — the statistics, the failure modes, the
edge cases, and the "will this actually run on someone else's machine" calls —
is where human engineering judgment did the real work.

---

## 8. Tech stack

**Backend:** Node.js, Express, ES modules, atomic JSON persistence (zero native
deps). **Frontend:** React 18, Vite, Recharts for charts, and **lucide-react**
for a consistent set of modern stroke-based SVG icons (no emoji, no raster
images anywhere in the UI — every glyph inherits the theme's `currentColor`).
**No** external database, message queue, or cloud dependency — it runs entirely
on a laptop.
