import { formatDistance, formatDuration } from '../utils/formatters'
import './RouteAlternatives.css'

/**
 * Displays a row of selectable route cards when ORS returns multiple alternatives.
 * Only rendered when there are at least 2 options.
 *
 * @param {object}     props
 * @param {object[]}   props.alternatives    - Array of RouteResult objects
 * @param {number}     props.selectedIndex   - Index of the currently active route
 * @param {Function}   props.onSelect        - Called with the chosen index
 */
export default function RouteAlternatives({ alternatives, selectedIndex, onSelect }) {
  if (!alternatives || alternatives.length < 2) return null

  return (
    <div className="route-alts">
      <p className="route-alts-label">Choose a route</p>
      <div className="route-alts-list">
        {alternatives.map((alt, i) => (
          <button
            key={i}
            className={`route-alt-card ${i === selectedIndex ? 'selected' : ''}`}
            onClick={() => onSelect(i)}
          >
            <span className="alt-index">{i + 1}</span>
            <span className="alt-stat">{formatDistance(alt.info.distance)}</span>
            <span className="alt-stat alt-muted">{formatDuration(alt.info.duration)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
