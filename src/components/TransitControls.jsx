import './TransitControls.css'

const TYPE_META = {
  bus:        { emoji: '🚌', label: 'Bus' },
  tram:       { emoji: '🚃', label: 'Tram' },
  subway:     { emoji: '🚇', label: 'Metro' },
  light_rail: { emoji: '🚊', label: 'Light Rail' },
}

/**
 * Sidebar panel for the transit routes layer.
 * Shows a master on/off toggle and, when enabled, per-route filter buttons
 * auto-populated from the routes the layer has fetched for the current viewport.
 *
 * @param {object}   props
 * @param {boolean}  props.enabled            - Master layer switch
 * @param {Function} props.onToggleEnabled    - Toggle the master switch
 * @param {import('../services/overpass').TransitRoute[]} props.routes - Routes in current viewport
 * @param {object}   props.visible            - { [routeId]: boolean }
 * @param {Function} props.onToggleRoute      - Called with numeric routeId
 */
export default function TransitControls({ enabled, onToggleEnabled, routes, visible, onToggleRoute }) {
  return (
    <div className="transit-controls">
      <div className="transit-header">
        <span className="transit-title">Transit Routes</span>
        <button
          className={`transit-master-btn ${enabled ? 'active' : ''}`}
          onClick={onToggleEnabled}
          aria-pressed={enabled}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>

      {enabled && routes.length === 0 && (
        <p className="transit-empty">Pan the map to load routes, then tap a line to show it (zoom ≥ 12)</p>
      )}

      {enabled && routes.length > 0 && (
        <div className="transit-route-list">
          {routes.map((r) => {
            const isVisible = visible[r.id] !== false
            const meta = TYPE_META[r.type]
            return (
              <button
                key={r.id}
                className={`transit-route-tag ${isVisible ? 'active' : ''}`}
                style={
                  isVisible
                    ? { background: r.color, borderColor: r.color, color: '#fff' }
                    : { borderColor: r.color, color: r.color }
                }
                onClick={() => onToggleRoute(r.id)}
                aria-pressed={isVisible}
                title={r.name}
              >
                {meta?.emoji ?? '🚏'} {r.ref}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
