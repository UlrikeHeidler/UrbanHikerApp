import { formatDistance } from '../utils/formatters'
import './ElevationProfile.css'

const W = 280
const H = 80
const PAD = { top: 8, right: 8, bottom: 20, left: 36 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

/**
 * Pure SVG elevation profile chart rendered from an array of ElevationPoints.
 * Displays a filled area chart with min/max elevation labels and distance axis.
 *
 * @param {object}   props
 * @param {import('../utils/geo').ElevationPoint[]} props.profile - Elevation data from routing
 */
export default function ElevationProfile({ profile }) {
  if (!profile?.length) return null

  const totalDist = profile[profile.length - 1].distanceM
  const elevations = profile.map((p) => p.elevationM)
  const minElev = Math.min(...elevations)
  const maxElev = Math.max(...elevations)
  const elevRange = maxElev - minElev || 1

  /** Map a profile point to SVG [x, y] coordinates. */
  function toXY({ distanceM, elevationM }) {
    const x = PAD.left + (distanceM / totalDist) * INNER_W
    const y = PAD.top + INNER_H - ((elevationM - minElev) / elevRange) * INNER_H
    return [x, y]
  }

  const points = profile.map(toXY)
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const first = points[0]
  const last  = points[points.length - 1]
  const fillPath = `${linePath} L${last[0].toFixed(1)},${(PAD.top + INNER_H).toFixed(1)} L${first[0].toFixed(1)},${(PAD.top + INNER_H).toFixed(1)} Z`

  // X-axis tick labels — show 3 evenly spaced distance labels
  const xTicks = [0, 0.5, 1].map((t) => ({
    x: PAD.left + t * INNER_W,
    label: formatDistance(t * totalDist),
  }))

  return (
    <div className="elevation-profile">
      <div className="elevation-title">Elevation Profile</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="elevation-svg" aria-label="Elevation profile chart">
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Filled area */}
        <path d={fillPath} fill="url(#elevGrad)" />

        {/* Profile line */}
        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Y-axis labels */}
        <text x={PAD.left - 4} y={PAD.top + 4} className="elev-label" textAnchor="end">{Math.round(maxElev)}m</text>
        <text x={PAD.left - 4} y={PAD.top + INNER_H + 2} className="elev-label" textAnchor="end">{Math.round(minElev)}m</text>

        {/* X-axis baseline */}
        <line
          x1={PAD.left} y1={PAD.top + INNER_H}
          x2={PAD.left + INNER_W} y2={PAD.top + INNER_H}
          stroke="#e5e7eb" strokeWidth="1"
        />

        {/* X-axis ticks */}
        {xTicks.map(({ x, label }) => (
          <text key={label} x={x} y={H - 4} className="elev-label" textAnchor="middle">{label}</text>
        ))}
      </svg>
    </div>
  )
}
