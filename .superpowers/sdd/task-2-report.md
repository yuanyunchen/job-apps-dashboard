# Task 2 Report: Responsive shell and six dashboard views

## Status

DONE

## RED evidence

Command:

```bash
npm test -- --run src/App.test.tsx
```

Result: exit code 1; one failed test suite and zero tests collected. The expected
missing-production-module failure was:

```text
Error: Failed to resolve import "./App" from "src/App.test.tsx".
Does the file exist?
```

This confirmed that the user-visible component tests existed before `App` or
any view/component implementation.

The tests specified navigation through all six views, activity-day selection,
next-month navigation, safe and unavailable job links, allowlisted notify
groups, company search, search empty state, load failure, and retry.

## Files changed

- `src/App.test.tsx`
- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`
- `src/test/setup.ts`
- `src/components/AppShell.tsx`
- `src/components/Heatmap.tsx`
- `src/components/JobCards.tsx`
- `src/components/MonthCalendar.tsx`
- `src/views/ActivityView.tsx`
- `src/views/AlertsView.tsx`
- `src/views/CalendarView.tsx`
- `src/views/NotifyView.tsx`
- `src/views/PendingView.tsx`

## Exact verification results

Focused component GREEN:

```bash
npm test -- --run src/App.test.tsx
```

Result: exit code 0; 1 test file passed and 7 tests passed in 2.02 seconds.

Full test suite:

```bash
npm test -- --run
```

Result: exit code 0; 2 test files passed and 26 tests passed in 2.37 seconds,
with no console warnings.

TypeScript:

```bash
npm run typecheck
```

Result: exit code 0 with no TypeScript diagnostics.

Production build:

```bash
npm run build
```

Result: exit code 0; Vite transformed 1,888 modules and emitted the production
bundle in 669 ms. Output sizes were 0.47 kB HTML, 15.66 kB CSS, and 248.85 kB
JavaScript before gzip.

## Commits

Feature commit: `284a0a5c6eb74a40cad2821bd7704d0b4d62df74`

Message: `feat: build six-view job dashboard`

Supporting test-isolation commit:
`8596617c26dccdf990b4938e3d79e5e19156b88e`

Message: `test: isolate component renders`

Both commits were pushed to `origin/cursor/build-job-dashboard-9665`.

## Self-review

- The shell uses one semantic six-button navigation that becomes a fixed
  desktop rail and a horizontally scrollable mobile strip without duplicating
  controls in the accessibility tree.
- View code is split by responsibility; shared heatmap, calendar, and job-card
  behavior is isolated in reusable components.
- Activity derives its 53-week grid and counts exclusively from Task 1 data.
- Calendar events are created only from supplied OA/interview dates and
  preserve the indigo/coral event distinction.
- Pending interviews, alerts, notify search, loading, and failure states all
  have intentional user-facing empty or recovery surfaces.
- Notify groups are derived by the Task 1 allowlist utility. Its URLs are
  already normalized through `safeUrl`; every other rendered external anchor
  calls `safeUrl` immediately before rendering.
- All four external-anchor render sites use `target="_blank"` and
  `rel="noreferrer"`. Unsafe records render “Link unavailable” instead.
- The sparse seed remains intentional through summary metrics, descriptive
  supporting text, selected-day detail, card composition, and tailored empty
  states.
- The first implementation verification exposed accumulated DOM between
  component tests. Root cause was missing explicit Testing Library cleanup in
  the shared Vitest setup; registering cleanup restored per-test isolation
  without changing behavior assertions.
- No dependency was added and no Task 1 model, utility, or fixture was changed.

## Accessibility and responsiveness

- Navigation, month controls, heatmap days, retry, and search use native
  semantic controls with visible focus rings.
- Active heatmap days expose `aria-pressed`; each day has a complete date and
  count label. Dynamic month and selected-day details use live semantics.
- Decorative icons are hidden from assistive technology, while links and icon
  controls have contextual accessible names.
- Desktop uses a fixed 252 px rail. At 900 px it becomes a sticky,
  horizontally scrollable navigation strip; at 620 px cards and groups collapse
  to one column and headers stack.
- Dense calendar and heatmap grids remain horizontally scrollable rather than
  shrinking below usable sizes.
- `prefers-reduced-motion` removes meaningful animation and transition
  duration.

## Concerns

None.
