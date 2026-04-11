# SmartSpend AI — Stitch Design Prompt

## What you are designing

A premium personal finance intelligence web application called **SmartSpend AI**. This is a fully functional product being demoed at a fintech hackathon. The design must feel like a funded startup's product — not a template, not a dashboard kit, not a generic SaaS UI. Every screen must feel considered, intentional, and human-crafted.

The app has 5 screens: Login, Dashboard, Transactions, Alerts, and AI Chat. Design all 5.

---

## Brand identity

**Name:** SmartSpend AI
**Tagline:** Your financial co-pilot
**Personality:** Intelligent, calm, trustworthy, slightly premium. Think Notion meets Linear meets a Bloomberg terminal — but warmer and more human.
**Target user:** Urban professional, 25-35, India market. Uses UPI. Earns well. Doesn't track spending. Gets surprised at month end.

**Color system — define a custom palette around these anchors:**
- Primary brand: a deep teal-green (not the standard shadcn teal — something richer, like `#0D9E8A` or similar)
- Danger/risk: a warm coral-red, not pure red — feels urgent without being alarming
- Warning: amber-gold, used sparingly
- Background: near-black or very dark charcoal (not pure `#000000`) — the dashboard lives in dark mode
- Surface cards: slightly lighter than background, subtle border with very low opacity white
- Text primary: near-white, high contrast
- Text secondary: muted, around 50-60% opacity white
- Accent glows: very subtle teal glow on active elements — not neon, just a whisper

**Typography:**
- Headings: a geometric sans — suggest Geist, DM Sans, or Plus Jakarta Sans
- Body/data: Inter (already loaded)
- Numbers/metrics: tabular lining figures, slightly larger weight — financial data must be scannable
- Do not mix more than 2 typefaces

**Do not use:** gradients on every card, heavy glassmorphism blur, bright neon colors, rainbow accents, animated particles, or anything that looks like a crypto dashboard.

---

## Layout system

**App shell (authenticated screens):**
- Persistent left sidebar, 220-240px wide, dark background slightly lighter than main bg
- Sidebar contains: logo + wordmark top, nav links with icons, user profile block at bottom
- Main content area: takes remaining width, has its own scroll
- Top bar: 56-64px tall, sticky, contains page title (left) and actions (right)
- Content padding: 24-32px, consistent across all pages
- Card radius: 12-16px, consistent
- All screens are desktop-first (1280px+), but must not break at 1024px

**Sidebar nav items (in order):**
- Dashboard (grid/home icon)
- Transactions (receipt icon)
- Alerts (bell icon) — shows unread count badge
- AI Assistant (message-square or sparkle icon)

**Active nav item:** teal left border accent + slightly lighter background + full opacity text. Inactive: muted text, no background.

---

## Screen 1 — Login

**Layout:** Split screen. Left half: brand panel. Right half: form.

**Left panel (brand side):**
- Dark background with the SmartSpend AI wordmark large
- Tagline: "Your financial co-pilot"
- 3 short value props listed with small icons:
  - "AI-powered spending analysis"
  - "Real-time risk prediction"
  - "Personalized financial insights"
- A subtle abstract visualization — NOT a chart screenshot. Could be: concentric rings, a minimal network graph, flowing lines suggesting data. Keep it tasteful, not loud.

**Right panel (form side):**
- Slightly lighter background than the left
- "Welcome back" heading, small subtext
- Email input, Password input — clean, minimal, full-width
- Login button — full width, brand teal, high contrast label
- "Demo Login" button — outlined/ghost style, below the primary button
- No social login, no forgot password needed for demo

---

## Screen 2 — Dashboard

This is the most important screen. Judges will spend the most time here.

**Layout:** Single scroll, 2-column grid below the stats row.

**Stats row (top, full width):**
4 KPI tiles in a horizontal row:
- Monthly Income
- Monthly Budget
- Spent This Month
- Remaining Budget

Each tile: compact, just the label and a large ₹ number. The "Remaining Budget" tile should be conditionally styled — red/coral tint if negative, green tint if healthy.

**Left column (60% width), top to bottom:**

1. **Financial Health Score card** — this is the hero element
   - Large circular arc gauge, animated — shows score 0-100
   - Score number centered in the arc, very large (48-56px)
   - Label below: "Financial Health" in muted text
   - Score ring color: green if ≥80, amber if ≥60, coral-red if <60
   - Below the gauge: 3 small sub-metric pills (Savings Rate, Budget Used, Anomalies Found)
   - This card must feel premium — it is the first thing a judge sees

2. **30-day Balance Forecast chart**
   - Recharts area chart, dark background card
   - Area fill: teal when positive balance, coral-red when trending to zero
   - X-axis: dates, minimal labels (show every 5th day)
   - Y-axis: ₹ amounts, right-aligned
   - A dashed horizontal line at ₹0 — "Zero balance" label on it
   - Tooltip on hover: shows date + projected balance
   - Chart title: "30-Day Forecast" with a small info icon

3. **What-If Simulator** (collapsible panel)
   - Collapsed by default, chevron to expand
   - When open: category dropdown + percentage slider (-50% to 0) + "Run Simulation" button
   - Results: a before/after card — left shows current state, right shows simulated state, green delta labels

**Right column (40% width), top to bottom:**

1. **Risk Assessment card**
   - Risk level badge at top: HIGH / MEDIUM / LOW with color coding
   - Large alert-style statement: "On track to overspend by ₹6,840 this month"
   - Risk factors list: 2-3 bullet points with small warning icons
   - Key metrics below: savings rate, budget used %
   - For HIGH risk: card has a very subtle coral-red left border accent or faint red background tint

2. **Category Budget Breakdown**
   - List of spending categories, sorted by spend descending
   - Each row: category icon (emoji or icon), category name, progress bar, ₹ amount / ₹ budget, percentage
   - Progress bar colors: green <70%, amber 70-90%, red >90%
   - Show top 6 categories
   - Compact row height — this is a list, not a card grid

---

## Screen 3 — Transactions

**Layout:** Full width content area, no columns.

**Summary strip (top):**
3 inline stats: Total Spend This Month | Anomalies Flagged | Top Category. Compact, one line.

**Filter/search bar:**
- Search input (left, takes most width)
- Category dropdown filter (right)
- Two tabs below: "All Transactions" | "Anomalies Only" — tab switcher style, not full tabs

**Transaction list:**
- Each row is a card-like row (subtle border, hover state)
- Left: category icon circle (colored by category), merchant name (bold), description (muted, smaller)
- Center: channel badge (UPI / card / netbanking) — small pill badge
- Right: date (muted), ₹ amount (bold, coral-red since it's a debit)
- Anomaly rows: red left border accent + a small "⚠ Flagged" badge in coral — must be visually distinct at a glance
- "Load more" button at the bottom, centered, ghost style

---

## Screen 4 — Alerts

**Layout:** Full width, single column list.

**Header:**
- Page title "Alerts" + unread count badge (e.g. "3 unread")
- "Mark all read" button, right-aligned, ghost style

**Alert items:**
- Each alert is a row with a left severity bar (3px wide, colored by severity)
- Severity: HIGH = coral-red, MEDIUM = amber, LOW = teal
- Alert title bold, message text muted below
- Right side: time ago label + read/unread dot indicator
- Unread items: slightly brighter background, unread dot is colored
- Read items: muted, dot is empty/gray
- Hover state: subtle background lift

**Empty state:**
- Centered, BellOff icon, "No alerts" heading, "Your finances are looking healthy" subtext

---

## Screen 5 — AI Chat (most impressive screen after Dashboard)

**Layout:** Full height chat interface within the content area. Three zones stacked vertically.

**Top bar (within content area, not the global topbar):**
- "SmartSpend AI" label with a small animated teal dot (pulsing — indicates AI is online)
- "Powered by GPT-4o" badge — small, subtle, right side
- Clear conversation button — ghost, right side

**Message area (scrollable, takes all remaining height):**
- Dark background, slightly different from sidebar
- User messages: right-aligned bubble, brand teal background, white text, rounded 18px with one squared corner
- Assistant messages: left-aligned, dark card surface, white text, rounded 18px, small "S" avatar (SmartSpend icon, teal circle) on the left
- Assistant messages that contain ₹ amounts: the amounts should be slightly bolded or teal-colored inline — make financial figures scannable
- Timestamps: very small, muted, below each bubble

**Suggested prompts (shown only when chat is empty):**
- 3 prompt chips, horizontally arranged, centered
- Each chip: outlined pill style, icon on left, prompt text
- Chips:
  - 💸 "Why am I spending so much this month?"
  - ✂️ "What if I cut my dining budget by 30%?"
  - 🔍 "Show me my most suspicious transactions"
- These are the demo-critical prompts — make them prominent

**Typing indicator:**
- 3 animated dots in an assistant bubble — same style as assistant messages
- Must look polished, not like a default browser animation

**Input area (fixed at bottom):**
- Dark input with subtle border
- Send button: teal, icon only (send/arrow icon), rounded
- Full width, comfortable height (48-52px input)
- "Press Enter to send" hint text inside the input as placeholder

---

## States to design

For each screen, also consider:

**Loading state:** Skeleton screens — dark skeleton shimmer, same layout as real content but replaced with animated gray blocks. Not just a spinner.

**Empty state:** Illustrated or icon-based, with a heading and subtext. Consistent style across all pages.

**Error state:** A contained error card with a retry button. Not a full-page error.

**High-risk state (Dashboard):** When risk is HIGH, the Risk Assessment card should feel alarming — stronger red tint, maybe a subtle pulsing border animation.

---

## What makes this design win

- The health score gauge must look like it belongs in a premium financial product — not a shadcn progress component
- The forecast chart colors must change dynamically (teal when balance is positive, red when declining)
- The chat interface must feel as polished as a real AI product (think Perplexity, Claude, ChatGPT) — not a generic chat widget
- Every number on screen must be instantly readable — financial data requires clear typographic hierarchy
- The overall app must feel dark, calm, and intelligent — not loud, not playful, not corporate

---

## Output format

Generate complete, production-ready component code for all 5 screens plus shared components (Sidebar, TopBar). Use React + TypeScript + Tailwind CSS. Define all custom colors as CSS variables. All components must be self-contained — no external icon library assumed beyond lucide-react. Export each screen as a default export. Include all sub-components inline within their screen file if they are screen-specific. Shared components (Sidebar, TopBar) as separate exports.
