import { useState } from 'react'
import './RoutePreferences.css'

/**
 * Collapsible panel exposing ORS foot-walking preference weightings.
 * Slider values range from 0 (disabled) to 0.8 (strong preference).
 *
 * @param {object}   props
 * @param {{ green: number, quiet: number, refineRoute: boolean }} props.preferences
 * @param {Function} props.onChange       - Called with the full updated preferences object
 * @param {number}   [props.refineMinFeet] - Configured threshold in feet (default 400)
 */
export default function RoutePreferences({ preferences, onChange, refineMinFeet = 400 }) {
  const [open, setOpen] = useState(false)

  function set(key, value) {
    onChange({ ...preferences, [key]: value })
  }

  const hasActive = preferences.green > 0 || preferences.quiet > 0 || preferences.refineRoute

  return (
    <div className="route-prefs">
      <button className="prefs-toggle" onClick={() => setOpen((o) => !o)}>
        <span>⚙ Routing preferences{hasActive ? ' •' : ''}</span>
        <span className="chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="prefs-body">
          <div className="pref-row">
            <label className="pref-label" htmlFor="pref-green">
              Prefer green areas
              <span className="pref-value">{Math.round(preferences.green * 100)}%</span>
            </label>
            <input id="pref-green" type="range" min="0" max="0.8" step="0.1"
              value={preferences.green}
              onChange={(e) => set('green', parseFloat(e.target.value))}
              className="pref-slider"
            />
          </div>
          <div className="pref-row">
            <label className="pref-label" htmlFor="pref-quiet">
              Prefer quiet roads
              <span className="pref-value">{Math.round(preferences.quiet * 100)}%</span>
            </label>
            <input id="pref-quiet" type="range" min="0" max="0.8" step="0.1"
              value={preferences.quiet}
              onChange={(e) => set('quiet', parseFloat(e.target.value))}
              className="pref-slider"
            />
          </div>
          <div className="pref-row pref-row--check">
            <label className="pref-label pref-label--check" htmlFor="pref-refine-route">
              Auto-refine away from main roads
              <span className="pref-hint">Re-routes segments &gt; {refineMinFeet} ft on primary/secondary roads after calculating</span>
            </label>
            <input id="pref-refine-route" type="checkbox"
              checked={!!preferences.refineRoute}
              onChange={(e) => set('refineRoute', e.target.checked)}
              className="pref-checkbox"
            />
          </div>
        </div>
      )}
    </div>
  )
}
