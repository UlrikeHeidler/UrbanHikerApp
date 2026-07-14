import './PoiControls.css'

const POI_LABELS = { bench: '🪑 Benches', water: '💧 Water', viewpoint: '🔭 Viewpoints' }

/**
 * Toggle panel for POI overlay types. Shows a "Load nearby POIs" button
 * that fetches from Overpass once a route is displayed.
 *
 * @param {object}   props
 * @param {{ bench: boolean, water: boolean, viewpoint: boolean }} props.enabled - Per-type visibility
 * @param {Function} props.onToggle    - Called with a PoiType string to toggle its visibility
 * @param {Function} props.onLoad      - Called when the user requests a POI fetch
 * @param {boolean}  props.isLoading   - True while a POI fetch is in progress
 * @param {boolean}  props.hasRoute    - True when a route is currently displayed
 */
export default function PoiControls({ enabled, onToggle, onLoad, isLoading, hasRoute }) {
  return (
    <div className="poi-controls">
      <div className="poi-header">
        <span className="poi-title">Nearby POIs</span>
        <button
          className="poi-load-btn"
          onClick={onLoad}
          disabled={!hasRoute || isLoading}
        >
          {isLoading ? 'Loading…' : 'Load'}
        </button>
      </div>
      <div className="poi-toggles">
        {Object.entries(POI_LABELS).map(([type, label]) => (
          <button
            key={type}
            className={`poi-tag ${enabled[type] ? 'active' : ''}`}
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
