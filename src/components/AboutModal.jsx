import './AboutModal.css'

/**
 * About / help modal. Opened by clicking the Urban Hiker logo in the sidebar header.
 *
 * @param {{ onClose: Function }} props
 */
export default function AboutModal({ onClose }) {
  return (
    <div className="about-overlay" role="dialog" aria-modal="true" aria-label="About Urban Hiker"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="about-modal">

        <div className="about-header">
          <img src="/UrbanHiker.png" alt="Urban Hiker" className="about-logo" />
          <div>
            <h2 className="about-title">Urban Hiker</h2>
            <p className="about-subtitle">Personal walking-route planner for urban areas</p>
          </div>
          <button className="about-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <section className="about-section">
          <h3>What is this?</h3>
          <p>
            Urban Hiker lets you plan, explore, and save walking routes in any city. Pick two
            points for a direct route, or generate a loop of any length from a single start point.
            Add waypoints, avoid main roads, download your route as GPX, and browse nearby points
            of interest — all from your browser, with no account required.
          </p>
        </section>

        <section className="about-section">
          <h3>How to use</h3>
          <ol className="about-steps">
            <li><strong>Set a start point</strong> — click the map or search an address. In A→B mode also set an end point.</li>
            <li><strong>Add waypoints</strong> (A→B only) — click <em>+ Add waypoint</em> then tap the map. Drag the handles to reorder.</li>
            <li><strong>Adjust preferences</strong> — bias the route toward green areas or quieter streets using the sliders.</li>
            <li><strong>Generate the route</strong> — hit <em>Get Walking Route</em> or <em>Generate Loop</em>. Alternatives appear below if available.</li>
            <li><strong>Refine on the map</strong> — click any section of the drawn route to re-route that segment away from main roads.</li>
            <li><strong>Explore POIs</strong> — toggle benches, water points, viewpoints, and transit stops from the result panel.</li>
            <li><strong>Save or export</strong> — name and save a route to local storage, or download it as a GPX file.</li>
            <li><strong>Install as app</strong> — use your browser's <em>Install</em> / <em>Add to Home Screen</em> option for offline-capable use on mobile or desktop.</li>
          </ol>
        </section>

        <section className="about-section">
          <h3>Powered by open services</h3>
          <ul className="about-credits">
            <li>
              <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a>
              {' '}— map tiles and geodata © OpenStreetMap contributors (<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">ODbL</a>)
            </li>
            <li>
              <a href="https://openrouteservice.org" target="_blank" rel="noreferrer">OpenRouteService</a>
              {' '}— walking-route calculation (free tier: 2 000 req/day)
            </li>
            <li>
              <a href="https://nominatim.org" target="_blank" rel="noreferrer">Nominatim</a>
              {' '}— address search and reverse geocoding, hosted by OpenStreetMap
            </li>
            <li>
              <a href="https://overpass-api.de" target="_blank" rel="noreferrer">Overpass API</a>
              {' '}— points of interest and transit data from OpenStreetMap
            </li>
          </ul>
          <p className="about-note">
            This app is not affiliated with, endorsed by, or supported by any of these services.
            Their respective terms and usage policies apply.
          </p>
        </section>

        <section className="about-section about-license">
          <h3>License — GNU GPL v3</h3>
          <p>
            Copyright © {new Date().getFullYear()} Urban Hiker Project. This program is free software:
            you may use, study, and redistribute it under the terms of the{' '}
            <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noreferrer">
              GNU General Public License v3
            </a>.
            Any copy or derivative work <strong>must remain free and open-source</strong> under the
            same license.
          </p>
          <p className="about-disclaimer">
            <strong>Disclaimer:</strong> This software is provided <em>"as is"</em>, without
            warranty of any kind. Use it at your own risk. The author accepts no responsibility or
            liability for any loss, damage, injury, or inconvenience arising from its use —
            including, but not limited to, inaccurate routes, missing hazards, or service
            unavailability.
          </p>
        </section>

      </div>
    </div>
  )
}
