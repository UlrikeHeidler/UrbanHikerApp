import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { fetchPois } from '../services/overpass'

const MIN_ZOOM = 13

/**
 * Fetches POIs for the current map viewport on demand.
 * A fetch is triggered only when `requestId` increments — there is no
 * automatic fetch on pan/zoom. Results are passed up via onPoisLoaded;
 * this component never clears existing POIs, it only adds to them.
 * Must be rendered inside a MapContainer.
 *
 * @param {object}   props
 * @param {string[]} props.enabledTypes    - POI types to fetch (empty = nothing fetched)
 * @param {number}   props.requestId       - Increment to trigger a fetch for the current viewport
 * @param {Function} props.onPoisLoaded    - Called with a PoiResult for the current viewport
 * @param {Function} props.onLoadingChange - Called with boolean while a fetch is in-flight
 * @param {Function} props.onError         - Called with an error message string on fetch failure
 */
export default function PoiLayer({ enabledTypes, requestId, onPoisLoaded, onLoadingChange, onError }) {
  const map = useMap()

  // Always up-to-date props reference — avoids stale closures inside the effect
  const propsRef = useRef({ enabledTypes, onPoisLoaded, onLoadingChange, onError })
  propsRef.current = { enabledTypes, onPoisLoaded, onLoadingChange, onError }

  useEffect(() => {
    if (requestId === 0) return
    const { enabledTypes, onPoisLoaded, onLoadingChange, onError } = propsRef.current
    if (!enabledTypes.length) return
    if (map.getZoom() < MIN_ZOOM) {
      onError?.(`Zoom in further (≥ zoom ${MIN_ZOOM}) to load POIs`)
      return
    }
    const b = map.getBounds()
    const bbox = {
      minLat: b.getSouth(), minLng: b.getWest(),
      maxLat: b.getNorth(), maxLng: b.getEast(),
    }
    let cancelled = false
    onLoadingChange(true)
    fetchPois(bbox, enabledTypes)
      .then((result) => { if (!cancelled) onPoisLoaded(result) })
      .catch((err) => { if (!cancelled) onError?.(err.message) })
      .finally(() => { if (!cancelled) onLoadingChange(false) })
    return () => { cancelled = true }
  }, [requestId]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
