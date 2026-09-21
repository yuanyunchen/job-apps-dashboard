# Job Apps Dashboard Design

## Goal

Build a polished, responsive, client-only dashboard that turns the supplied job application seed into six useful views while never rendering a URL marked bad by the link-check data.

## Chosen approach

Use a small React + Vite + TypeScript application with custom CSS and focused date/data utilities. This keeps the interface visually distinctive and the bundle lean while making the filtering, alert, calendar, and heatmap behavior independently testable.

Alternatives considered:

1. A component library plus a date library would speed up common widgets, but adds visual defaults and bundle weight that work against the requested Apple-clean style.
2. A single large dashboard component would be faster to scaffold, but makes six views and their empty states difficult to test and maintain.
3. The chosen approach uses lightweight components grouped by responsibility and native date handling for the limited date arithmetic required.

## Information architecture

The application opens on Activity. Desktop uses a fixed left navigation rail and mobile uses a horizontally scrollable navigation strip. Each of the six views has a concise title, supporting copy, and a consistent content surface:

- **Activity:** a year-scale, GitHub-style contribution grid derived from `daily_applied_counts`. A selectable day opens an adjacent detail panel showing date and application count.
- **Calendar:** an Apple Calendar-inspired month grid with previous/next controls. OA deadlines use indigo and interview events use coral. Events are built only from dates present in seed records.
- **Pending OA:** one card per pending OA with company identity, supplied blurb, role, optional due date, and a safe link action.
- **Pending Interviews:** the same card system with an intentional empty state when the seed has no interviews.
- **Alerts:** two sections for deadlines due within one day and deadlines due within one week. The generated timestamp is the deterministic reference date.
- **Big-tech notify:** only allowlisted companies, grouped by company with supplied blurbs and role rows. A compact search filters companies and roles.

The global header shows the current view and the seed refresh date. Small overview metrics expose applied, OA, interview, and notified counts without inventing data.

## Visual system

The palette uses warm off-white page backgrounds, white elevated surfaces, dark graphite type, cool gray borders, and blue-violet accents. Rounded cards, subtle shadows, restrained motion, generous whitespace, and system typography create the Apple-like feel. The activity grid uses a five-step green scale with a neutral empty color, preserving the visual grammar of GitHub contributions.

Company marks are generated typographic initials, not externally loaded images. Icons come from a local icon package and external-link actions have visible text and focus states. Layouts collapse to one column on narrow screens, and dense grids remain horizontally scrollable when necessary.

## Data flow and URL safety

At startup, the app fetches `/data/seed.json` and `/data/link-check.json`. A loader validates the required top-level shape and derives a single `Set` from both `seed.broken_urls` and `linkCheck.bad`. Every link passes through one helper:

- Missing, malformed, non-HTTP(S), or listed-bad URLs become unavailable.
- Valid HTTP(S) URLs not present in the bad set remain clickable.
- The UI displays “Link unavailable” when no safe URL exists.

The seed is copied unchanged to `public/data/seed.json`. The supplied link-check file is copied unchanged to `public/data/link-check.json`.

## Date behavior

Seed dates are parsed as calendar dates, avoiding timezone shifts. The heatmap spans the 52 weeks ending in the week containing the generated date. The calendar initially opens to the generated month and can navigate without changing data. Alerts classify future dated OA/interview items as:

- due in one day: deadline is tomorrow;
- due in one week: deadline is two through seven days away.

Undated items remain in pending views but do not appear in the calendar or alerts.

## Failure and empty states

A loading state keeps the shell stable while JSON loads. A clear error surface offers a retry if either file cannot be loaded or validated. Empty collections show tailored copy rather than blank space. This is expected for pending interviews, calendar events, and alerts in the supplied seed.

## Testing and completion criteria

Unit tests cover broken-link exclusion, company allowlisting, date parsing, month layout, heatmap generation, and alert buckets. Component tests verify navigation, day selection, calendar navigation, pending-card links, empty states, and big-tech search. Completion requires:

1. all six views render from the supplied seed;
2. every bad URL is absent from rendered anchors;
3. production build, type checks, and automated tests pass;
4. desktop and mobile browser checks confirm responsive layout and interactions;
5. README documents `npm install && npm run dev`.
