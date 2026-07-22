import { formatDistance, formatDuration } from '../utils/formatters'
import './SegmentBreakdown.css'

/**
 * Displays per-segment distance and duration statistics for a multi-waypoint route.
 *
 * @param {object}   props
 * @param {import('../utils/segmentStats').SegmentStat[]} props.segments
 */
export default function SegmentBreakdown({ segments }) {
  if (!segments?.length) return null

  return (
    <div className="segment-breakdown">
      <h4 className="segment-breakdown__title">Segment breakdown</h4>
      <ol className="segment-breakdown__list">
        {segments.map((seg, i) => (
          <li key={i} className="segment-breakdown__item">
            <span className="segment-breakdown__route">
              <span className="segment-breakdown__dot">{i + 1}</span>
              <span className="segment-breakdown__label">{seg.from}</span>
              <span className="segment-breakdown__arrow">→</span>
              <span className="segment-breakdown__label">{seg.to}</span>
            </span>
            <span className="segment-breakdown__stats">
              <span className="segment-breakdown__dist">{formatDistance(seg.distanceM)}</span>
              <span className="segment-breakdown__sep">·</span>
              <span className="segment-breakdown__dur">{formatDuration(seg.durationS)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
