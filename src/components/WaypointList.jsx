import './WaypointList.css'

/**
 * Displays the current waypoint list with add/remove controls.
 * Only shown in A-to-B mode. Clicking "Add waypoint" switches the
 * active pin so the next map click places a waypoint.
 *
 * @param {object}   props
 * @param {object[]} props.waypoints       - Array of {lat, lng} waypoints
 * @param {Array}    props.waypointLabels  - Resolved address per waypoint (null = loading, '' = no address)
 * @param {boolean}  props.isAdding        - True when activePin === 'waypoint'
 * @param {Function} props.onStartAdd      - Called when the user wants to add a waypoint
 * @param {Function} props.onRemove        - Called with the waypoint index to remove
 */
export default function WaypointList({ waypoints, waypointLabels = [], isAdding, onStartAdd, onRemove }) {
  return (
    <div className="waypoint-list">
      <div className="waypoint-header">
        <span className="waypoint-title">Via (waypoints)</span>
        <button
          className={`waypoint-add-btn ${isAdding ? 'adding' : ''}`}
          onClick={onStartAdd}
        >
          {isAdding ? '📍 Click map…' : '+ Add waypoint'}
        </button>
      </div>

      {waypoints.length > 0 && (
        <ul className="waypoint-items">
          {waypoints.map((wp, i) => {
            const label = waypointLabels[i]
            const display = label === null || label === undefined
              ? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`  // still resolving
              : label !== ''
                ? label
                : `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}`  // no address (park/unnamed area)

            return (
              <li key={i} className="waypoint-item">
                <span className="waypoint-dot">{i + 1}</span>
                <span className="waypoint-coord" title={`${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}>
                  {display}
                </span>
                <button className="waypoint-remove" onClick={() => onRemove(i)} aria-label="Remove waypoint">✕</button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
