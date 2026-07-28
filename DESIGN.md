# Design System — Situation Room

## Product Context
- **What this is:** Geopolitical intelligence dashboard that makes world events digestible for average people
- **Who it's for:** Non-experts who want to understand what's happening in the world without military jargon or analyst-speak
- **Space/industry:** Geopolitical news, intelligence, prediction markets
- **Project type:** Web app (desktop-first, sidebar navigation)
- **Competitors:** World Monitor, ACLED, Stratfor, Janes, BlackRock GRI Dashboard

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian with warmth
- **Decoration level:** Minimal — typography and information hierarchy do all the work
- **Mood:** Serious and trustworthy but approachable. Like a well-designed news product, not a military command center. No scan lines, no glow effects, no dramatic loading states, no military jargon.
- **Navigation:** Linear/Notion-style left sidebar. Collapsible to icons on tablet.
- **Reference:** Variant E from design exploration (April 17, 2026). Mockup at `~/.gstack/projects/ra-wilson-situation-room/designs/situation-room-direction-20260417/variant-E.html`

## Pages / Views
The app is multi-page with sidebar navigation:
1. **Feed** — Default view. Scannable event list with expandable inline details, historical timelines, and AI summaries
2. **Alerts** — Notification-style alert center with filtering + inline preference management ("Manage" toggle)
3. **Event Detail** — Deep-dive with two-column layout: timeline (left) + context cards (right). Key players, impact assessment, related markets, sources
4. **Globe** — 3D globe view (toggleable, NOT the default home screen)
5. **Markets** — Prediction markets page with human-readable questions and odds
6. **Watchlist** — User's tracked regions, events, and markets
7. **Settings** — Preferences with sub-navigation: Profile, Feed, Alerts, Display, Data

## Typography
- **Body/UI:** DM Sans — clean, professional, excellent small-size readability. Not overused.
- **Data/Timestamps/Labels:** Geist Mono — precision feel for numbers, times, source counts, filter labels
- **Loading:** Google Fonts CDN (`family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Geist+Mono:wght@400;500;600`)
- **Base:** 16px body (`html { font-size: 16px }`). Non-experts read this product — readability over density.
- **Scale (rem-based, 16px root):**
  - 0.625rem / 10px — section labels (mono, uppercase, letter-spacing 1.2px)
  - 0.6875rem / 11px — metadata, sync status, timestamps (mono)
  - 0.75rem / 12px — secondary labels, region pills
  - 0.8125rem / 13px — nav items, dense table cells, card meta
  - 1rem / 16px — body text, event titles, feed row titles, expanded content
  - 1.125rem / 18px — subheadings
  - 1.25rem / 20px — page titles
  - 1.375rem / 22px — event detail hero title
- **Rules:**
  - Body text is 16px minimum. Never smaller for content users read.
  - No all-caps for content OR severity labels. Only for structural section labels (nav groups like "OVERVIEW", metadata categories like "FULL TIMELINE"). Severity reads as "High severity" with a colored dot, not "HIGH SEVERITY".
  - No serif fonts. The editorial direction was rejected.
  - Monospace for data only: timestamps, source counts, percentages, numeric values, keyboard shortcuts. Not for severity labels (those are prose).

## Color
- **Approach:** Restrained — one warm accent against cold dark neutrals
- **Background:** `#0B0B0F` — near-black with blue undertone
- **Surface:** `#131318` — sidebar, cards, elevated panels
- **Surface elevated:** `#1A1A20` — hover states, inputs, nested surfaces
- **Border:** `#1F1F26` — all separators and dividers
- **Text primary:** `#E8E8EC` — headings, event titles, active content
- **Text secondary:** `#86868F` — body text, descriptions, summaries
- **Text muted:** `#55555E` — labels, placeholders, tertiary info
- **Accent:** `#D4915C` — active nav item, CTAs, links, interactive highlights. Used sparingly.
- **Accent dim:** `rgba(212, 145, 92, 0.15)` — active nav background, selected states
- **Severity/Semantic:**
  - Critical/Breaking: `#E5534B` (red)
  - High/Escalation: `#D4915C` (amber, same as accent)
  - Moderate/Info: `#539BF5` (blue)
  - Low/De-escalation: `#57AB5A` (green)
- **Dark mode:** This IS dark mode. Light mode is not currently planned. `color-scheme: dark` set on html.
- **Contrast targets (WCAG AA, non-negotiable):**
  - Body text (`--text-secondary` on `--bg`): ≥ 4.5:1 — `#86868F` on `#0B0B0F` measures ~5.2:1 ✓
  - Large text / headings (`--text-primary` on `--bg`): ≥ 3:1 — `#E8E8EC` on `#0B0B0F` measures ~15:1 ✓
  - UI components and focus rings: ≥ 3:1 against adjacent surfaces
  - `--text-muted` (`#55555E`) is decorative only — never used for body text. ~2.8:1, below AA.
- **Rules:**
  - No cyan/teal. Every competitor uses it. We don't.
  - No glow effects, no decorative box-shadows, no neon colors. This includes severity dots: a saturated color on dark background is sufficient; no `box-shadow` halo.
  - Severity communicated through small color indicators (6–8px dots, 2–3px left borders), never through large colored backgrounds or colored text badges.
  - Alert row backgrounds MAY use `rgba()` severity tints at ~8–12% opacity, paired with a left border. Badges stay neutral-surface with a colored dot.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — not Bloomberg-dense, not marketing-airy
- **Scale:** 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24 / 32 / 48
- **Key measurements:**
  - Sidebar width: 240px (collapses to ~56px icons on tablet)
  - Nav item padding: 7px 8px 7px 12px
  - Card padding: 16px-20px
  - Section gap: 16px-24px
  - Content max-width: none (fills space next to sidebar)

## Layout
- **Approach:** Sidebar + content area (Linear/Notion-style)
- **Sidebar:** 240px fixed left, collapsible to icon-only (56px) below 1024px
- **Content area:** Fluid, fills remaining space
- **Event detail:** Two-column (60/40) at ≥1280px. Below 1280px, stack: timeline first, context cards below. Context cards switch from a single column to a 2-up grid between 768–1279px when stacked.
- **Feed:** Single-column event list with expandable inline detail
- **Breakpoints:**
  - `≥1280px` — full sidebar (240px) + two-column event detail
  - `1024–1279px` — full sidebar + stacked event detail with 2-up context grid
  - `768–1023px` — icon-only sidebar (56px) + stacked single-column content
  - `<768px` — not a target viewport for v1. Mobile is a future concern; design desktop-first without blocking mobile later (no fixed widths that break, no hover-only interactions).
- **Border radius:**
  - Small (inputs, pills, badges): 4-6px
  - Medium (cards, nav items, buttons): 6-8px
  - Large (modals, panels): 12px
  - Full (avatar, dots): 9999px

## Components

### Sidebar Navigation
- Fixed left, 240px wide
- Logo mark (SR in bordered square) + "Situation Room" text
- Cmd+K search bar
- Grouped nav sections: OVERVIEW (Feed, Globe), INTELLIGENCE (Events, Alerts, Markets), YOU (Watchlist, Settings)
- Active item: amber left border (2px) + amber text + dim amber background
- Alert badge count on Alerts nav item (red dot with number)
- Footer: sync status + user avatar

### Event Row (Feed)
- Severity dot (6px colored circle) + title + region pill + time (mono) + source count (mono)
- Click to expand inline: shows historical timeline, AI summary ("What's happening" / "Why it matters"), related links
- Hover: subtle background highlight to surface-elevated
- No card borders in collapsed state, just subtle separators

### Historical Timeline
- Vertical connected dots with lines
- Each entry: date (mono), headline, 1-2 sentence description, source link
- Most recent entry highlighted (brighter text, possibly accent dot)
- "Load earlier events" at bottom

### Alert Card
- Color-coded left border (3px): red = breaking, amber = escalation, green = de-escalation, blue = new development
- Unread: slightly brighter background
- Content: icon, timestamp, title in plain English, context sentence, "View" link
- Plain language, not military jargon. "Tensions rising in South China Sea" not "THREAT LEVEL ELEVATED"

### Alert Preferences (inline)
- Toggled via "Manage" button in Alerts header
- Alert type toggles with descriptions
- Region pills with remove buttons + "Add" button
- Sensitivity selector: Low / Medium / High
- Delivery method checkboxes
- Quiet hours time range

### Prediction Market Card
- Human-readable question ("Will there be a ceasefire in Ukraine?")
- Large percentage number + direction arrow
- Optional: mini progress bar, volume, related event link

### Empty States
Every list view has a designed empty state. Never show a blank area.
- **Feed (no events):** Centered in content area. Small icon (circle outline, `--text-muted`), one-line message ("No events match your filters" or "All quiet. Pipeline last synced 14m ago."), and a single action link ("Clear filters" or "Refresh"). No illustration, no decoration.
- **Watchlist (nothing tracked):** "You aren't tracking anything yet." + "Browse the feed to add regions, events, or markets to your watchlist." + primary button "Go to Feed".
- **Markets (API down or no data):** "Markets unavailable." + "Last synced: {timestamp}" + retry link. Never show `--` placeholders.
- **Alerts (none):** "No alerts right now." + "Sensitivity: Medium. Change in Settings." (links to Settings > Alerts)
- **Rules:** No happy talk. No emoji. No illustrations. One icon maximum (16px line icon in `--text-muted`). Empty states are for orientation, not encouragement.

### Loading & Error States
- **Initial load:** Skeleton rows matching real content dimensions. Shimmer is a single subtle gradient sweep, not a pulse. Never more than 5 skeleton rows visible.
- **Refetch:** Silent. Existing content stays; a 1px progress line at top of content area in `--accent` (optional). No spinners over real content.
- **Error (fetch failed):** Inline banner at top of content area in `rgba(229,83,75,0.08)` with left border `--red`. Specific message: "Couldn't load events. {reason}". Retry button.
- **Partial failure:** Show what loaded; note missing sections with inline muted text ("Markets unavailable — retry").

### Settings
- Sub-navigation within settings page: Profile, Feed, Alerts, Display, Data
- Content depth selector with visual preview
- Source toggles with reliability indicator
- "Simplify language" toggle with before/after preview
- Theme: Dark/Light/System cards
- Density: Compact/Default/Comfortable

## Motion
- **Approach:** Minimal-functional
- **Easing:** ease (0.15s) for hover states, ease (0.2s) for sidebar collapse, ease (0.12s) for nav items
- **Rules:**
  - No pulsing animations, no glow animations, no scan-line effects
  - Hover transitions on interactive elements: 0.12-0.15s
  - Sidebar collapse: 0.2s ease
  - Expanded event content: smooth height transition or instant
  - No entrance animations on page content
  - Never animate `all`. List properties explicitly. Only animate `transform`, `opacity`, `background-color`, `border-color`, `color`.
  - Exception: single subtle pulse on the most recent timeline dot (optional, very subtle)
- **Reduced motion:** When `prefers-reduced-motion: reduce`, all transitions collapse to `0.01ms` (effectively instant). The timeline-dot pulse is disabled entirely. State changes still visible via color/position, just without transition.

## Accessibility
- **Focus:** Every interactive element has a visible `:focus-visible` ring — 2px `--accent` outline with 2px offset. Never `outline: none` without a replacement.
- **Touch targets:** Minimum 44×44px hit area for all interactive elements on touch viewports. Visual size may be smaller (e.g. 28px avatar button) but padding or `::before` pseudo-element extends the hit area.
- **Keyboard:** All flows reachable by keyboard. Cmd+K opens search. Esc closes expanded feed rows and modals. Tab order follows visual order.
- **Semantics:** Severity communicated via dot color PLUS text label ("High severity"), never color alone. Region pills use text, not flag emoji alone.
- **Screen reader:** Timeline dots are decorative (`aria-hidden`). Severity dots have `aria-label="High severity"` etc. Sync status dot has `aria-label="Connected"` / `"Offline"`.

## Content Voice
- **Headlines:** Plain English. "Philippines Recalls Ambassador Over Naval Standoff" not "SOUTH CHINA SEA THREAT LEVEL CRITICAL"
- **Summaries:** Written for people who don't follow geopolitics daily. 2-3 sentences max. No jargon.
- **Alerts:** Conversational. "Tensions rising in South China Sea — 5 new reports in 24h" not "ELEVATED THREAT DETECTED"
- **Loading states:** Descriptive. "Loading events..." not "ANALYZING GLOBAL INTEL..."
- **Status:** Understated. "Live" with a green dot, not "SYSTEMS NOMINAL"

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-17 | Sidebar navigation (Linear-style) over top tabs or bottom tabs | Best balance of screen real estate, feature scalability, and professional feel |
| 2026-04-17 | Multi-page app with 7 views | Users need dedicated spaces for alerts, settings, watchlist — can't fit in single page |
| 2026-04-17 | Globe is toggleable, not default | Target audience (average people) leads with news, not a map |
| 2026-04-17 | Amber accent (#D4915C) | Every competitor uses cyan/teal. Amber is warm, authoritative, instantly recognizable |
| 2026-04-17 | DM Sans only, no serifs | Serif headlines (Instrument Serif) were explored and rejected — felt too editorial for an app |
| 2026-04-17 | Historical timeline as core UX pattern | Users wanted to see how events evolve over time, not just current snapshots |
| 2026-04-17 | Plain language content voice | Target audience is average people, not intelligence analysts |
| 2026-04-17 | Inline alert preferences | Settings for alerts should be accessible right where you manage alerts, not buried in a settings page |
| 2026-04-21 | Body text base raised to 16px (from 13px) | Target audience is non-experts reading news. Readability > density. 13px was a Bloomberg-terminal reflex; this isn't that product. |
| 2026-04-21 | Severity dot glow removed | Contradicted "no glow effects" rule. A saturated 8px dot on dark bg reads as urgent without the halo. |
| 2026-04-21 | Severity labels are sentence case, never all-caps | All-caps severity ("HIGH SEVERITY") felt like a command-center. "High severity" + colored dot communicates the same information without the military cosplay. |
| 2026-04-21 | Severity never uses colored badge backgrounds | Enforces the existing "dots and left borders only" rule for event detail too. Colored backgrounds read as alert spam at scale. |
| 2026-04-21 | Explicit breakpoints defined (1280 / 1024 / 768) | variant-E assumed wide viewport; stacking behavior on mid-range displays was undefined. |
| 2026-04-21 | Accessibility rules added (focus rings, touch targets, reduced-motion, WCAG targets) | These were implicit in the UX principles but missing from the design system. Needed to be explicit before building. |
| 2026-04-21 | Empty and loading states specified | variant-E had no empty states. Edge cases are where design holds up or falls apart; defining them now prevents ad-hoc "No data" placeholders later. |
