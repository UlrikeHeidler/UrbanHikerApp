import { useState, useRef, useEffect } from 'react'
import { Polyline, Tooltip, useMapEvents } from 'react-leaflet'
import { fetchTransitRoutes } from '../services/overpass'

const DEBOUNCE_MS = 800
const MIN_ZOOM = 12

/**
 * Fetches and renders transit route polylines for the current map viewport.
 * Attaches to the Leaflet map via hooks — must be rendered inside a MapContainer.
 *
 * @param {object}   props
 * @param {boolean}  props.enabled          - Master visibility switch
 * @param {object}   props.visible          - { [routeId: number]: boolean } per-route filter
 * @param {Function} props.onRoutesLoaded   - Called with TransitRoute[] after each fetch
 */
export default function TransitRoutesLayer({ enabled, visible, onRoutesLoaded }) {
  const [routes, setRoutes] = useState([])
  const timerRef = useRef(null)

  // Always up-to-date props reference — avoids stale closures in map event handlers
  const propsRef = useRef({ enabled, onRoutesLoaded })
  propsRef.current = { enabled, onRoutesLoaded }

  // Stable function: reads latest props via ref, so useMapEvents handlers never go stale
  const schedule = useRef((map) => {
    const { enabled, onRoutesLoaded } = propsRef.current
    if (!enabled) return
    if (map.getZoom() < MIN_ZOOM) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const b = map.getBounds()
      const bbox = {
        minLat: b.getSouth(), minLng: b.getWest(),
        maxLat: b.getNorth(), maxLng: b.getEast(),
      }
      try {
        const fetched = await fetchTransitRoutes(bbox)
        setRoutes(fetched)
        onRoutesLoaded(fetched)
      } catch {
        // Network errors are silent — the layer stays empty until the next pan
      }
    }, DEBOUNCE_MS)
  }).current

  const map = useMapEvents({
    moveend(e) { schedule(e.target) },
    zoomend(e) { schedule(e.target) },
  })

  // Trigger fetch when enabled; clear routes when disabled
  useEffect(() => {
    if (enabled) {
      schedule(map)
    } else {
      clearTimeout(timerRef.current)
      setRoutes([])
      propsRef.current.onRoutesLoaded([])
    }
    return () => clearTimeout(timerRef.current)
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!enabled) return null

  return routes
    .filter((r) => visible[r.id] !== false)
    .flatMap((r) =>
      r.ways.map((way, i) => (
        <Polyline
          key={`${r.id}-${i}`}
          positions={way}
          pathOptions={{ color: r.color, weight: 3, opacity: 0.75 }}
        >
          {i === 0 && (
            <Tooltip
              permanent
              direction="center"
              className="transit-route-label"
              offset={[0, 0]}
            >
              {r.ref}
            </Tooltip>
          )}
        </Polyline>
      ))
    )
}
