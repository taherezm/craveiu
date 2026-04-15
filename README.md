# CraveIU

**Stop checking every dining hall menu. CraveIU tells you exactly where to eat.**

---


CraveIU ingests menus from all 5 dining halls, normalizes the food items, and ranks each hall in real time based on your personal food preferences. You set what you want, what you'd like, and what to avoid — CraveIU does the rest.

---

## Features

- **Personalized rankings** — halls are scored and ranked based on your saved preferences every time you open the app
- **Food preference editor** — mark foods as must-have, nice-to-have, or avoid, with weighted scoring applied to each
- **Match explanations** — see exactly why a hall is ranked where it is (e.g. *"McNutt has chicken tenders, fries, and cookies at lunch"*)
- **Menu search** — search across all dining halls for a specific food
- **Meal period awareness** — rankings adjust based on whether it's breakfast, lunch, or dinner
- **Hall detail pages** — view the full menu for any dining hall
- **Notifications** — set alerts for when a specific food is being served
- **Admin panel** — monitor ingestion health and trigger manual menu syncs

---

## Dining Halls

| Hall | Known For |
|------|-----------|
| Collins Eatery | Great breakfast, solid basics |
| Forest Dining Hall | Most diverse, global options |
| Goodbody Hall Eatery | Healthy-forward, good salads |
| McNutt Dining Hall | Comfort food |
| Wright Dining Hall | Late-night favorite, pizza & grill |

---

## How It's Built

**Stack**
- [Next.js 16](https://nextjs.org) (App Router) — server and client components, API routes
- TypeScript — strict mode throughout
- Tailwind CSS v4 + Radix UI — styling and accessible UI primitives
- Drizzle ORM + Supabase (PostgreSQL) — type-safe schema and hosted database
- TanStack Query — client-side data fetching and caching
- Zod — runtime validation on all API routes
- Vitest — unit tests

**Normalization Engine**

Raw menu item names from different halls are inconsistent. The normalization engine maps any name to a canonical food using keyword matching and fuzzy similarity scoring. For example:
- `"Applewood Smoked Bacon"` → `bacon`
- `"Crispy Chicken Tenders"` → `chicken_tenders`
- `"Smashburger"` → `burgers`

**Ranking Engine**

Each dining hall is scored per user session using a weighted rules system:

| Rule | Points |
|------|--------|
| Must-have item present | +10 |
| Nice-to-have item present | +5 |
| Avoided item present | -8 |
| 3+ positive matches | +3 bonus |
| Item in current meal period | +2 per item |
| 2+ matches in same food category | +2 cluster bonus |

**Ingestion Layer**

Menus are pulled through an adapter interface, making it easy to swap between a mock adapter (deterministic per date, used in development) and the live IU Dining adapter. A scheduler orchestrates full ingest runs and deduplicates entries via source hash.

