import './PoiControls.css'

/** Labels and colors must stay in sync with MapView's POI_STYLE. */
const POI_CONFIG = {
  bench:     { label: '🪑 Benches',   color: '#16a34a' },
  water:     { label: '💧 Water',     color: '#2563eb' },
  viewpoint: { label: '🔭 Viewpoints', color: '#9333ea' },
  bus_stop:  { label: '🚌 Bus Stops',  color: '#f97316' },
  tram_stop: { label: '🚃 Tram Stops', color: '#0d9488' },
  subway:    { label: '🚇 Metro',      color: '#7c3aed' },
}

/**
 * Toggle panel for POI overlay types. Enabling a type immediately triggers
 * a viewport fetch via the PoiLayer component in MapView.
 *
 * @param {object}   props
 * @param {{ bench: boolean, water: boolean, viewpoint: boolean, bus_stop: boolean, tram_stop: boolean, subway: boolean }} props.enabled
 * @param {Function} props.onToggle   - Called with a PoiType string to toggle visibility
 * @param {boolean}  props.isLoading  - True while a viewport fetch is in progress
 */
export default function PoiControls({ enabled, onToggle, isLoading }) {
  return (
    <div className="poi-controls">
      <div className="poi-header">
        <span className="poi-title">Nearby POIs</span>
        {isLoading && <span className="poi-loading">Loading…</span>}
      </div>
      <div className="poi-toggles">
        {Object.entries(POI_CONFIG).map(([type, { label, color }]) => (
          <button
            key={type}
            className={`poi-tag ${enabled[type] ? 'active' : ''}`}
            style={enabled[type]
              ? { background: color, borderColor: color, color: '#fff' }
              : { borderColor: color }}
            onClick={() => onToggle(type)}
            aria-pressed={enabled[type]}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
