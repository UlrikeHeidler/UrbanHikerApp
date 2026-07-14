# Urban Hiking App — Claude Context

Personal walking-route app for urban areas. No commercial model.

## Environment

- **OS:** Windows 11 — always use **PowerShell** syntax and the PowerShell tool. Never bash.
- **Shell chaining:** Use `;` or `if ($?) { ... }`. The `&&` operator is not valid in PowerShell 5.1.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 6 |
| Maps | Leaflet.js + react-leaflet + OpenStreetMap tiles |
| Routing | OpenRouteService (foot-walking profile) — `VITE_ORS_API_KEY` in `.env` |
| Geocoding | Nominatim (no key required) |
| Tests | Vitest + jsdom |

## Project Structure

```
src/
  components/      UI components (map, sidebar, search, route info)
  services/        External API calls (geocoding.js, routing.js)
  utils/           Shared pure helpers (formatters, validators, etc.)
  test/            Global test setup (setup.js)
```

## Coding Rules

1. **Tests required** — every new service/utility needs a `*.test.js` covering unit cases + security cases.
2. **JSDoc on all exports** — `@param`, `@returns`, `@throws` where relevant.
3. **No duplicate code** — shared logic goes in `utils/`. If a pattern appears twice, extract it.
4. **File size limit** — keep files under ~150-200 lines. Split by responsibility if exceeded.
5. **Stable architecture** — do not restructure folders or rename modules without an explicit request.

## Development Commands

```powershell
npm run dev           # start dev server at http://localhost:5173
npm test              # run all tests once
npm run test:watch    # run tests in watch mode
npm run test:coverage # coverage report in /coverage
npm run build         # production build
```

## Phases

- **Phase 1** ✅ — Map, click-to-pin, address search, A-to-B walking route, distance/time display
- **Phase 2** ✅ — Loop/round-trip mode, distance/duration input, route variation seed
- **Phase 3** ✅ — PWA (Android install), saved routes (localStorage), elevation profile (SVG)
- **Phase 4** ✅ — Routing preferences (green/quiet), waypoints, POI overlay (Overpass), GPX export

## API Key Setup

Copy `.env.example` to `.env` and fill in your free ORS key:
```
VITE_ORS_API_KEY=your_key_here
```
Get one at https://openrouteservice.org/dev/#/signup (free, no credit card, 2 000 req/day).
