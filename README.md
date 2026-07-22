# Urban Hiker

A personal web app for planning walking routes in cities — find a path from A to B, or generate a loop walk of a given distance or duration, right in your browser. Works as an installable PWA on desktop and Android.

## What it does

- **A-to-B routing** — search for start and end addresses; pins placed on the map are automatically reverse-geocoded to show the nearest street address instead of raw coordinates, or click the map to place pins; up to 3 alternative routes are offered so you can pick the one that suits you
- **Walk distance target** — set a desired distance or duration for an A-to-B route; the app adds a detour waypoint so you get your steps in rather than always taking the shortest path; a Flip button lets you choose which side of the line the detour bows toward
- **Loop walks** — pick a starting point and a desired distance (or walking time), and get a circular route back to where you started; use the seed slider to generate different variations
- **Intermediate waypoints** — add stops along an A-to-B route
- **Routing preferences** — bias the route toward green areas (parks) or quieter streets
- **Elevation profile** — visualise the height changes along your route
- **POI overlay** — show nearby benches, drinking water points, viewpoints, bus stops, tram stops, and metro stations from OpenStreetMap; each toggle button is colour-coded to match its map marker; clicking a transit stop shows its routes
- **Transit routes layer** — a separate map overlay that draws bus, tram, subway, and light-rail route lines for the current viewport in the same colours as the corresponding stop markers; route numbers are labelled directly on the lines; individual routes can be toggled on/off from the sidebar panel; the layer fetches automatically as you pan or zoom (zoom ≥ 12 required)
- **GPX export** — download your route for use in any GPS device or app
- **Save routes** — store favourite routes locally in your browser (no account needed)
- **API usage tracker** — the 📊 button in the sidebar footer opens a popup with call counts, success rates, a 7-day bar chart, and today's usage vs the free-tier daily limits (ORS 2 000 / Nominatim 500 / Overpass 10 000); data is kept for 7 days and can be cleared instantly; tracking can be turned off in Settings → Defaults
- **Settings panel** — configure default route mode, default loop distance, routing preference defaults, POI visibility defaults, default start point, and API key — all persisted in the browser; reset to base profile at any time
- **PWA** — install it on your phone's home screen or desktop for offline-capable use

All map data is from [OpenStreetMap](https://www.openstreetmap.org). Walking routes are calculated by [OpenRouteService](https://openrouteservice.org).

## Getting started

### 1. Get an API key

Routing requires a free [OpenRouteService](https://openrouteservice.org/dev/#/signup) API key.

- Sign up at openrouteservice.org (free, no credit card required)
- The free tier allows 2 000 routing requests per day, which is more than enough for personal use
- Your key is stored only in your browser's local storage — it is never sent anywhere except directly to the OpenRouteService API

### 2. Open the app

Visit the deployed URL (GitHub Pages) or run it locally (see below). On first load, the **API Key (required)** panel at the bottom of the sidebar will be open. Paste your key there and click **Save key**. That's it — the key persists across sessions.

### Running locally

```
npm install
npm run dev
```

For local development you can also put your key in a `.env` file (copy `.env.example`) instead of the in-app settings:

```
VITE_ORS_API_KEY=your_key_here
```

## Disclaimer

**Use this software at your own risk.**

This is a personal hobby project, provided as-is with no warranties of any kind — not for fitness for a particular purpose, accuracy of routes, or uninterrupted availability. Walking routes are suggestions only. Always use your own judgement about whether a route is safe, legal, and suitable for your abilities. The author accepts no liability for any injury, loss, or damage arising from use of this app or reliance on the routes it generates.

## License

Personal use only. Not intended for commercial deployment.
