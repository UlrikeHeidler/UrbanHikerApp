import { formatDistance, formatDuration } from '../utils/formatters'
import './RouteInfo.css'

/**
 * Displays route summary statistics: distance, estimated walk time, and
 * optional elevation gain/loss.
 *
 * @param {object} props
 * @param {import('../services/routing').RouteInfo} props.info
 */
export default function RouteInfo({ info }) {
  return (
    <div className="route-info">
      <h2 className="route-info-title">Walking Route</h2>
      <div className="route-stats">
        <div className="stat">
          <span className="stat-icon">📏</span>
          <div>
            <div className="stat-value">{formatDistance(info.distance)}</div>
            <div className="stat-label">Distance</div>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon">⏱</span>
          <div>
            <div className="stat-value">{formatDuration(info.duration)}</div>
            <div className="stat-label">Est. Walk Time</div>
          </div>
        </div>
      </div>
      {info.ascent != null && (
        <div className="route-elevation">
          <span>↑ {Math.round(info.ascent)} m ascent</span>
          <span>↓ {Math.round(info.descent)} m descent</span>
        </div>
      )}
    </div>
  )
}
