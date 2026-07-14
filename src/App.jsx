import { useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { loadRoutes, saveRoute, deleteRoute } from './services/storage'
import { fetchPois } from './services/overpass'
import { getBoundingBox } from './utils/geo'
import './App.css'

/** @typedef {'a-to-b' | 'loop'} RouteMode */

const DEFAULT_POIS = { bench: [], water: [], viewpoint: [] }
const DEFAULT_POI_ENABLED = { bench: true, water: true, viewpoint: true }
const DEFAULT_PREFERENCES = { green: 0, quiet: 0 }

/**
 * Root application component. Owns all shared state and coordinates
 * communication between the Sidebar and the MapView.
 */
export default function App() {
  const [mode, setMode]                         = useState(/** @type {RouteMode} */ ('a-to-b'))
  const [startPoint, setStartPoint]             = useState(null)
  const [endPoint, setEndPoint]                 = useState(null)
  const [waypoints, setWaypoints]               = useState([])
  const [activePin, setActivePin]               = useState('start')
  const [preferences, setPreferences]           = useState(DEFAULT_PREFERENCES)
  const [route, setRoute]                       = useState(null)
  const [routeInfo, setRouteInfo]               = useState(null)
  const [elevationProfile, setElevationProfile] = useState(null)
  const [isLoading, setIsLoading]               = useState(false)
  const [error, setError]                       = useState(null)
  const [savedRoutes, setSavedRoutes]           = useState(() => loadRoutes())
  const [pois, setPois]                         = useState(DEFAULT_POIS)
  const [poisEnabled, setPoisEnabled]           = useState(DEFAULT_POI_ENABLED)
  const [poisLoading, setPoisLoading]           = useState(false)

  function clearRoute() {
    setRoute(null)
    setRouteInfo(null)
    setElevationProfile(null)
    setError(null)
    setPois(DEFAULT_POIS)
  }

  function handleMapClick(latlng) {
    if (activePin === 'waypoint') {
      setWaypoints((prev) => [...prev, { lat: latlng.lat, lng: latlng.lng }])
      // stay in waypoint mode so multiple waypoints can be added
      return
    }
    if (mode === 'loop') {
      setStartPoint(latlng)
    } else if (activePin === 'start') {
      setStartPoint(latlng)
      setActivePin('end')
    } else {
      setEndPoint(latlng)
      setActivePin('start')
    }
    clearRoute()
  }

  function handleSetPoint(type, latlng) {
    if (type === 'start') setStartPoint(latlng)
    else setEndPoint(latlng)
    clearRoute()
  }

  function handleModeChange(newMode) {
    setMode(newMode)
    setStartPoint(null)
    setEndPoint(null)
    setWaypoints([])
    setActivePin('start')
    clearRoute()
  }

  function handleClear() {
    setStartPoint(null)
    setEndPoint(null)
    setWaypoints([])
    setActivePin('start')
    clearRoute()
  }

  function handleRemoveWaypoint(index) {
    setWaypoints((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSaveRoute(name) {
    const entry = saveRoute({
      name, mode, startPoint, endPoint: endPoint ?? null,
      loopMeters: null, loopSeed: null,
      coordinates: route, info: routeInfo,
      elevationProfile: elevationProfile ?? [],
    })
    setSavedRoutes((prev) => [entry, ...prev])
  }

  function handleLoadRoute(saved) {
    setMode(saved.mode)
    setStartPoint(saved.startPoint)
    setEndPoint(saved.endPoint ?? null)
    setWaypoints([])
    setRoute(saved.coordinates)
    setRouteInfo(saved.info)
    setElevationProfile(saved.elevationProfile ?? null)
    setError(null)
    setActivePin('start')
    setPois(DEFAULT_POIS)
  }

  function handleDeleteRoute(id) {
    deleteRoute(id)
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id))
  }

  function handleTogglePoi(type) {
    setPoisEnabled((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  async function handleLoadPois() {
    if (!route?.length) return
    setPoisLoading(true)
    try {
      const bbox = getBoundingBox(route)
      const result = await fetchPois(bbox, ['bench', 'water', 'viewpoint'])
      setPois(result)
    } catch (err) {
      setError(`POI load failed: ${err.message}`)
    } finally {
      setPoisLoading(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        mode={mode} onModeChange={handleModeChange}
        startPoint={startPoint} endPoint={endPoint}
        waypoints={waypoints} onRemoveWaypoint={handleRemoveWaypoint}
        activePin={activePin} setActivePin={setActivePin}
        onSetPoint={handleSetPoint} onClear={handleClear}
        preferences={preferences} onPreferencesChange={setPreferences}
        route={route} setRoute={setRoute}
        routeInfo={routeInfo} setRouteInfo={setRouteInfo}
        elevationProfile={elevationProfile} setElevationProfile={setElevationProfile}
        isLoading={isLoading} setIsLoading={setIsLoading}
        error={error} setError={setError}
        savedRoutes={savedRoutes}
        onSaveRoute={handleSaveRoute} onLoadRoute={handleLoadRoute} onDeleteRoute={handleDeleteRoute}
        poisEnabled={poisEnabled} onTogglePoi={handleTogglePoi}
        onLoadPois={handleLoadPois} poisLoading={poisLoading}
      />
      <MapView
        startPoint={startPoint} endPoint={endPoint}
        route={route} mode={mode}
        activePin={activePin} waypoints={waypoints}
        pois={pois} poisEnabled={poisEnabled}
        onMapClick={handleMapClick}
      />
    </div>
  )
}
