# Job Apps Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive six-view job applications dashboard that renders the supplied seed and excludes every URL identified as broken.

**Architecture:** A Vite React application loads the two static JSON files once, normalizes them into testable view models, and renders one selected view inside a shared responsive shell. Pure utilities own all link, date, heatmap, calendar, allowlist, and alert behavior; view components own interaction and presentation.

**Tech Stack:** React, Vite, TypeScript, Vitest, Testing Library, Lucide React, custom CSS.

## Global Constraints

- Use a light/off-white Apple-clean visual language and a GitHub-style activity heatmap.
- Render only data from the supplied files; never invent job URLs.
- Exclude the union of `seed.broken_urls` and `linkCheck.bad`.
- Show “Link unavailable” when a record has no safe HTTP(S) URL.
- Big-tech notifications include only the company allowlist in the user request.
- The app is client-only and must run with `npm install && npm run dev`.

---

## File map

- `package.json`, Vite/TypeScript configs: commands and toolchain.
- `public/data/*.json`: unchanged supplied datasets.
- `src/types.ts`: external and derived data contracts.
- `src/lib/dashboard.ts`: pure normalization, date, link, calendar, heatmap, and alert functions.
- `src/lib/dashboard.test.ts`: behavior tests for all pure transformations.
- `src/components/AppShell.tsx`: responsive navigation and page chrome.
- `src/components/Heatmap.tsx`: contribution grid and day selection.
- `src/components/MonthCalendar.tsx`: month navigation and deadline/event rendering.
- `src/components/JobCards.tsx`: shared OA/interview card patterns.
- `src/views/*.tsx`: the six view compositions.
- `src/App.tsx`: loading, error, navigation, and view routing.
- `src/App.test.tsx`: user-visible navigation, interaction, safety, and empty-state tests.
- `src/styles.css`: complete visual and responsive system.
- `README.md`: install and run instructions.

### Task 1: Toolchain, data contracts, and safe derivations

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/test/setup.ts`
- Create: `src/types.ts`
- Create: `src/lib/dashboard.test.ts`
- Create: `src/lib/dashboard.ts`
- Copy: `public/data/seed.json`
- Copy: `public/data/link-check.json`

**Interfaces:**
- Produces: `loadDashboardData(): Promise<DashboardData>`
- Produces: `safeUrl(url: string | null | undefined, broken: Set<string>): string | null`
- Produces: `buildHeatmap(counts: Record<string, number>, endDate: string): HeatmapWeek[]`
- Produces: `buildMonth(year: number, month: number, events: CalendarEvent[]): CalendarCell[]`
- Produces: `buildAlerts(data: DashboardSeed): AlertBuckets`
- Produces: `getNotifiedCompanies(data: DashboardSeed, broken: Set<string>): NotifiedCompany[]`

- [ ] **Step 1: Add the Vite/Vitest toolchain and unchanged JSON fixtures**

Use package-manager-installed current releases for React, Vite, TypeScript, Vitest, jsdom, Testing Library, and Lucide. Configure `npm run dev`, `npm run test`, `npm run typecheck`, and `npm run build`.

- [ ] **Step 2: Write failing data tests**

Cover these exact behaviors:

```ts
expect(safeUrl('https://example.com/job', new Set())).toBe('https://example.com/job')
expect(safeUrl('https://bad.example/job', new Set(['https://bad.example/job']))).toBeNull()
expect(safeUrl('javascript:alert(1)', new Set())).toBeNull()
expect(buildHeatmap({ '2026-09-21': 31 }, '2026-09-21').at(-1)?.days.some(
  day => day.date === '2026-09-21' && day.count === 31,
)).toBe(true)
expect(buildAlerts(seedWithTomorrowAndWeekDeadlines).oneDay).toHaveLength(1)
expect(buildAlerts(seedWithTomorrowAndWeekDeadlines).oneWeek).toHaveLength(1)
expect(getNotifiedCompanies(seed, broken).every(company =>
  BIG_TECH_COMPANIES.has(normalizeCompany(company.name)),
)).toBe(true)
```

- [ ] **Step 3: Run the tests and verify RED**

Run: `npm test -- --run src/lib/dashboard.test.ts`

Expected: FAIL because `src/lib/dashboard.ts` exports do not exist.

- [ ] **Step 4: Implement minimal pure transformations**

Parse date-only strings into local calendar dates, use `generated_at.slice(0, 10)` as the deterministic reference, generate 53 Sunday-start weeks for the activity grid, generate 42 month cells, and build safe company/role models from only the allowlisted company groups.

- [ ] **Step 5: Run data tests and verify GREEN**

Run: `npm test -- --run src/lib/dashboard.test.ts`

Expected: all data utility tests pass with no warnings.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html public src/test src/types.ts src/lib
git commit -m "feat: add dashboard data model"
git push -u origin cursor/build-job-dashboard-9665
```

### Task 2: Responsive shell and all six views

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.test.tsx`
- Create: `src/App.tsx`
- Create: `src/components/AppShell.tsx`
- Create: `src/components/Heatmap.tsx`
- Create: `src/components/MonthCalendar.tsx`
- Create: `src/components/JobCards.tsx`
- Create: `src/views/ActivityView.tsx`
- Create: `src/views/CalendarView.tsx`
- Create: `src/views/PendingView.tsx`
- Create: `src/views/AlertsView.tsx`
- Create: `src/views/NotifyView.tsx`
- Create: `src/styles.css`

**Interfaces:**
- Consumes: all Task 1 data contracts and pure utilities.
- Produces: default `App` component with six accessible navigation buttons.
- Produces: `Heatmap`, `MonthCalendar`, `JobCards`, and six view compositions.

- [ ] **Step 1: Write failing component tests**

Test user-visible behavior:

```tsx
render(<App initialData={{ seed, linkCheck }} />)
expect(screen.getByRole('heading', { name: /application activity/i })).toBeVisible()
await user.click(screen.getByRole('button', { name: /pending interviews/i }))
expect(screen.getByText(/no interviews scheduled/i)).toBeVisible()
await user.click(screen.getByRole('button', { name: /big-tech notify/i }))
expect(screen.queryByText('Tailscale')).not.toBeInTheDocument()
expect(screen.queryByRole('link', { name: /broken role/i })).not.toBeInTheDocument()
await user.type(screen.getByRole('searchbox'), 'cursor')
expect(screen.getByText('Cursor')).toBeVisible()
expect(screen.queryByText('Amazon')).not.toBeInTheDocument()
```

Also verify activity-day selection, next-month calendar navigation, link-unavailable rendering, and retry behavior.

- [ ] **Step 2: Run component tests and verify RED**

Run: `npm test -- --run src/App.test.tsx`

Expected: FAIL because the application and components do not exist.

- [ ] **Step 3: Implement the shared shell and views**

Build semantic buttons, headings, links, status text, and empty states first. Add local state only for selected view, selected heatmap day, calendar month, notify search, and load retry. Every external anchor must receive a URL returned by `safeUrl`, plus `target="_blank"` and `rel="noreferrer"`.

- [ ] **Step 4: Add the visual system**

Define CSS custom properties for warm backgrounds, surfaces, borders, type, indigo OA events, coral interviews, and five green activity levels. Implement desktop rail, mobile nav, card grids, 7-column calendar, scrollable heatmap, visible focus rings, reduced-motion behavior, and breakpoints at 900px and 620px.

- [ ] **Step 5: Run component and full tests and verify GREEN**

Run: `npm test -- --run`

Expected: all utility and component tests pass with no console warnings.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: build six-view job dashboard"
git push -u origin cursor/build-job-dashboard-9665
```

### Task 3: Documentation and release verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: exact local run instructions and a concise six-view feature summary.

- [ ] **Step 1: Update README**

Document:

```md
## Run locally

```bash
npm install
npm run dev
```
```

Include test and production build commands and state that data is loaded from `public/data/seed.json`.

- [ ] **Step 2: Run automated release checks**

Run:

```bash
npm test -- --run
npm run typecheck
npm run build
```

Expected: each exits 0 with no test failures or TypeScript errors.

- [ ] **Step 3: Run browser checks**

Verify all navigation items, heatmap day selection, calendar month controls, notify search, safe links, empty states, desktop layout, and mobile layout. Inspect the browser console for errors.

- [ ] **Step 4: Commit and update the pull request**

```bash
git add README.md
git commit -m "docs: add dashboard run instructions"
git push -u origin cursor/build-job-dashboard-9665
```

Update the draft pull request with final summary and verification evidence.
