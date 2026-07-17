import { useRef, useEffect } from 'react'
import { useMapEvents } from 'react-leaflet'
import { fetchPois } from '../services/overpass'

const DEBOUNCE_MS = 800
const MIN_ZOOM = 13

/**
 * Fetches POIs for the current map viewport whenever the user pans or zooms.
 * Results are passed up via onPoisLoaded and merged by the caller — this
 * component never clears existing POIs, it only adds to them.
 * Must be rendered inside a MapContainer.
 *
 * @param {object}   props
 * @param {string[]} props.enabledTypes    - POI types to fetch (empty = nothing fetched)
 * @param {Function} props.onPoisLoaded    - Called with a PoiResult for the current viewport
 * @param {Function} props.onLoadingChange - Called with boolean while a fetch is in-flight
 * @param {Function} props.onError         - Called with an error message string on fetch failure
 */
export default function PoiLayer({ enabledTypes, onPoisLoaded, onLoadingChange, onError }) {
  const timerRef = useRef(null)

  // Always up-to-date props reference — avoids stale closures in map event handlers
  const propsRef = useRef({ enabledTypes, onPoisLoaded, onLoadingChange, onError })
  propsRef.current = { enabledTypes, onPoisLoaded, onLoadingChange, onError }

  // Stable function: reads latest props via ref, so useMapEvents handlers never go stale
  const schedule = useRef((map) => {
    const { enabledTypes, onPoisLoaded, onLoadingChange, onError } = propsRef.current
    console.log('[PoiLayer] schedule called — types:', enabledTypes, 'zoom:', map.getZoom())
    if (!enabledTypes.length) { console.log('[PoiLayer] skipped — no enabled types'); return }
    if (map.getZoom() < MIN_ZOOM) { console.log('[PoiLayer] skipped — zoom', map.getZoom(), '< MIN_ZOOM', MIN_ZOOM); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const b = map.getBounds()
      const bbox = {
        minLat: b.getSouth(), minLng: b.getWest(),
        maxLat: b.getNorth(), maxLng: b.getEast(),
      }
      console.log('[PoiLayer] fetching', enabledTypes, 'in bbox', bbox)
      onLoadingChange(true)
      try {
        const result = await fetchPois(bbox, enabledTypes)
        console.log('[PoiLayer] fetch OK —', Object.entries(result).map(([t, ns]) => `${t}:${ns.length}`).join(' '))
        onPoisLoaded(result)
      } catch (err) {
        console.error('[PoiLayer] fetch error:', err.message)
        onError?.(err.message)
      } finally {
        onLoadingChange(false)
      }
    }, DEBOUNCE_MS)
  }).current

  const map = useMapEvents({
    moveend(e) { schedule(e.target) },
    zoomend(e) { schedule(e.target) },
  })

  // Re-fetch for the current viewport whenever the set of enabled types changes
  useEffect(() => {
    schedule(map)
    return () => clearTimeout(timerRef.current)
  }, [enabledTypes.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
