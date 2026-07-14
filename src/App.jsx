import { useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { loadRoutes, saveRoute, deleteRoute } from './services/storage'
import { reverseGeocode } from './services/geocoding'
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
  const [routeAlternatives, setRouteAlternatives] = useState([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [detourWaypoint, setDetourWaypoint] = useState(null)
  const [startLabel, setStartLabel] = useState(null)
  const [endLabel, setEndLabel]     = useState(null)
  const [isLoading, setIsLoading]               = useState(false)
  const [error, setError]                       = useState(null)
  const [savedRoutes, setSavedRoutes]           = useState(() => loadRoutes())
  const [pois, setPois]                         = useState(DEFAULT_POIS)
  const [poisEnabled, setPoisEnabled]           = useState(DEFAULT_POI_ENABLED)
  const [poisLoading, setPoisLoading]           = useState(false)

  async function resolveLabel(latlng, setLabel) {
    setLabel(null)
    const label = await reverseGeocode(latlng.lat, latlng.lng)
    if (label) setLabel(label)
  }

  function clearRoute() {
    setRoute(null)
    setRouteInfo(null)
    setElevationProfile(null)
    setError(null)
    setPois(DEFAULT_POIS)
    setRouteAlternatives([])
    setSelectedRouteIndex(0)
    setDetourWaypoint(null)
  }

  function handleSelectRoute(index) {
    const alt = routeAlternatives[index]
    if (!alt) return
    setSelectedRouteIndex(index)
    setRoute(alt.coordinates)
    setRouteInfo(alt.info)
    setElevationProfile(alt.elevationProfile)
  }

  function handleMapClick(latlng) {
    if (activePin === 'waypoint') {
      setWaypoints((prev) => [...prev, { lat: latlng.lat, lng: latlng.lng }])
      // stay in waypoint mode so multiple waypoints can be added
      return
    }
    if (mode === 'loop') {
      setStartPoint(latlng)
      resolveLabel(latlng, setStartLabel)
    } else if (activePin === 'start') {
      setStartPoint(latlng)
      resolveLabel(latlng, setStartLabel)
      setActivePin('end')
    } else {
      setEndPoint(latlng)
      resolveLabel(latlng, setEndLabel)
      setActivePin('start')
    }
    clearRoute()
  }

  function handleSetPoint(type, latlng) {
    if (type === 'start') { setStartPoint(latlng); resolveLabel(latlng, setStartLabel) }
    else                  { setEndPoint(latlng);   resolveLabel(latlng, setEndLabel) }
    clearRoute()
  }

  function handleModeChange(newMode) {
    setMode(newMode)
    setStartPoint(null)
    setEndPoint(null)
    setStartLabel(null)
    setEndLabel(null)
    setWaypoints([])
    setActivePin('start')
    clearRoute()
  }

  function handleClear() {
    setStartPoint(null)
    setEndPoint(null)
    setStartLabel(null)
    setEndLabel(null)
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
    setRouteAlternatives([])
    setSelectedRouteIndex(0)
    // Re-resolve labels for the loaded points
    if (saved.startPoint) resolveLabel(saved.startPoint, setStartLabel)
    else setStartLabel(null)
    if (saved.endPoint) resolveLabel(saved.endPoint, setEndLabel)
    else setEndLabel(null)
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
        startLabel={startLabel} endLabel={endLabel}
        waypoints={waypoints} onRemoveWaypoint={handleRemoveWaypoint}
        activePin={activePin} setActivePin={setActivePin}
        onSetPoint={handleSetPoint} onClear={handleClear}
        preferences={preferences} onPreferencesChange={setPreferences}
        route={route} setRoute={setRoute}
        routeInfo={routeInfo} setRouteInfo={setRouteInfo}
        elevationProfile={elevationProfile} setElevationProfile={setElevationProfile}
        routeAlternatives={routeAlternatives} setRouteAlternatives={setRouteAlternatives}
        selectedRouteIndex={selectedRouteIndex} setSelectedRouteIndex={setSelectedRouteIndex}
        onSelectRoute={handleSelectRoute}
        setDetourWaypoint={setDetourWaypoint}
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
        altRoutes={routeAlternatives.filter((_, i) => i !== selectedRouteIndex).map(r => r.coordinates)}
        detourWaypoint={detourWaypoint}
        pois={pois} poisEnabled={poisEnabled}
        onMapClick={handleMapClick}
      />
    </div>
  )
}
