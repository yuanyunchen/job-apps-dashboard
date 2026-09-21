# Job Apps Dashboard

A light-theme dashboard for tracking job applications and opportunities.

## Views

- **Activity** — application totals and a selectable daily activity heatmap.
- **Calendar** — assessment deadlines and interviews with month navigation.
- **Pending OA** — active online assessments and available job links.
- **Pending interviews** — scheduled interviews.
- **Alerts** — deadlines grouped by urgency.
- **Big-tech notify** — allowlisted opportunities with company and role search.

## Run locally

```bash
npm install
npm run dev
```

Dashboard data is loaded from `public/data/seed.json`.

## Checks

```bash
npm test -- --run
npm run typecheck
npm run build
```
