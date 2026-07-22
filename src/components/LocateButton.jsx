import { useState, useEffect } from 'react'
import { useMap } from 'react-leaflet'
import './LocateButton.css'

/**
 * A locate-me button rendered as a Leaflet control overlay.
 * Uses the browser Geolocation API via Leaflet's map.locate() to pan to the
 * user's current position. Calls onLocate with the resolved {lat, lng} so the
 * parent can optionally set it as the start point.
 *
 * Must be rendered inside a react-leaflet MapContainer.
 *
 * @param {object}   props
 * @param {Function} [props.onLocate] - Called with {lat, lng} on successful fix
 */
export default function LocateButton({ onLocate }) {
  const map = useMap()
  const [status, setStatus] = useState('idle') // 'idle' | 'locating' | 'error'
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    function onFound(e) {
      setStatus('idle')
      setErrorMsg(null)
      onLocate?.({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
    function onError(e) {
      setStatus('error')
      setErrorMsg(e.message)
      setTimeout(() => setStatus('idle'), 3000)
    }
    map.on('locationfound', onFound)
    map.on('locationerror', onError)
    return () => {
      map.off('locationfound', onFound)
      map.off('locationerror', onError)
    }
  }, [map, onLocate])

  function handleClick() {
    setStatus('locating')
    setErrorMsg(null)
    map.locate({ setView: true, maxZoom: 16 })
  }

  return (
    <div className="locate-btn-container leaflet-bottom leaflet-right">
      <div className="leaflet-control">
        <button
          className={`locate-btn locate-btn--${status}`}
          onClick={handleClick}
          title="Show my location"
          aria-label="Show my location"
          disabled={status === 'locating'}
        >
          {status === 'locating' ? '⟳' : '◎'}
        </button>
        {status === 'error' && errorMsg && (
          <div className="locate-btn__error">{errorMsg}</div>
        )}
      </div>
    </div>
  )
}
