import { useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import { loadRoutes, saveRoute, deleteRoute } from './services/storage'
import { getDefaultStart, getAppDefaults } from './services/settings'
import { fetchSubRoute } from './services/routing'
import { nearestCoordIndex, findLocalSegment, spliceSubRoute } from './utils/routeRefine'
import { haversineDistance } from './utils/geo'
import { reverseGeocode } from './services/geocoding'
import { fetchPois } from './services/overpass'
import { getBoundingBox } from './utils/geo'
import './App.css'

/** @typedef {'a-to-b' | 'loop'} RouteMode */

const DEFAULT_POIS = { bench: [], water: [], viewpoint: [], bus_stop: [], tram_stop: [], subway: [] }
const _appDefaults = getAppDefaults()

/**
 * Root application component. Owns all shared state and coordinates
 * communication between the Sidebar and the MapView.
 */
export default function App() {
  const [mode, setMode]                         = useState(/** @type {RouteMode} */ (_appDefaults.defaultMode))
  const [startPoint, setStartPoint]             = useState(() => { const d = getDefaultStart(); return d ? { lat: d.lat, lng: d.lng } : null })
  const [endPoint, setEndPoint]                 = useState(null)
  const [waypoints, setWaypoints]               = useState([])
  const [activePin, setActivePin]               = useState('start')
  const [preferences, setPreferences]           = useState(_appDefaults.defaultPreferences)
  const [route, setRoute]                       = useState(null)
  const [routeWayTypes, setRouteWayTypes]       = useState([])
  const [routeInfo, setRouteInfo]               = useState(null)
  const [elevationProfile, setElevationProfile] = useState(null)
  const [routeAlternatives, setRouteAlternatives] = useState([])
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0)
  const [detourWaypoint, setDetourWaypoint] = useState(null)
  const [startLabel, setStartLabel] = useState(() => getDefaultStart()?.label ?? null)
  const [endLabel, setEndLabel]     = useState(null)
  const [isLoading, setIsLoading]               = useState(false)
  const [error, setError]                       = useState(null)
  const [savedRoutes, setSavedRoutes]           = useState(() => loadRoutes())
  const [pois, setPois]                         = useState(DEFAULT_POIS)
  const [poisEnabled, setPoisEnabled]           = useState(_appDefaults.defaultPoiEnabled)
  const [poisLoading, setPoisLoading]           = useState(false)

  async function resolveLabel(latlng, setLabel) {
    setLabel(null)
    const label = await reverseGeocode(latlng.lat, latlng.lng)
    if (label) setLabel(label)
  }

  function clearRoute() {
    setRoute(null)
    setRouteWayTypes([])
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

  function applyDefaultStart() {
    const def = getDefaultStart()
    setStartPoint(def ? { lat: def.lat, lng: def.lng } : null)
    setStartLabel(def?.label ?? null)
  }

  function handleModeChange(newMode) {
    setMode(newMode)
    applyDefaultStart()
    setEndPoint(null)
    setEndLabel(null)
    setWaypoints([])
    setActivePin('start')
    clearRoute()
  }

  function handleClear() {
    applyDefaultStart()
    setEndPoint(null)
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

  function handleDefaultStartChange(newDefault) {
    if (!startPoint) {
      setStartPoint(newDefault ? { lat: newDefault.lat, lng: newDefault.lng } : null)
      setStartLabel(newDefault?.label ?? null)
    }
  }

  function handleDeleteRoute(id) {
    deleteRoute(id)
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleRouteClick(latlng) {
    if (!route?.length) return
    const centerIdx = nearestCoordIndex(route, latlng)
    const { startIdx, endIdx } = findLocalSegment(route, routeWayTypes, centerIdx)
    const segStart = { lat: route[startIdx][0], lng: route[startIdx][1] }
    const segEnd   = { lat: route[endIdx][0],   lng: route[endIdx][1] }
    setIsLoading(true)
    setError(null)
    try {
      const sub = await fetchSubRoute(segStart, segEnd)
      const newCoords = spliceSubRoute(route, startIdx, endIdx, sub.coordinates)
      const newWayTypes = [
        ...routeWayTypes.slice(0, startIdx),
        ...sub.wayTypes,
        ...routeWayTypes.slice(endIdx + 1),
      ]
      const newDist = newCoords.reduce((sum, c, i) =>
        i === 0 ? 0 : sum + haversineDistance(newCoords[i - 1], c), 0)
      setRoute(newCoords)
      setRouteWayTypes(newWayTypes)
      setRouteInfo((prev) => ({ ...prev, distance: newDist }))
    } catch (err) {
      setError(`Could not find an alternative for that segment: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  function handleTogglePoi(type) {
    setPoisEnabled((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  async function handleLoadPois() {
    if (!route?.length) return
    setPoisLoading(true)
    try {
      const bbox = getBoundingBox(route)
      const result = await fetchPois(bbox, ['bench', 'water', 'viewpoint', 'bus_stop', 'tram_stop', 'subway'])
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
        routeWayTypes={routeWayTypes} setRouteWayTypes={setRouteWayTypes}
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
        onDefaultStartChange={handleDefaultStartChange}
        poisEnabled={poisEnabled} onTogglePoi={handleTogglePoi}
        onLoadPois={handleLoadPois} poisLoading={poisLoading}
        onRouteClick={handleRouteClick}
      />
      <MapView
        startPoint={startPoint} endPoint={endPoint}
        route={route} mode={mode}
        activePin={activePin} waypoints={waypoints}
        altRoutes={routeAlternatives.filter((_, i) => i !== selectedRouteIndex).map(r => r.coordinates)}
        detourWaypoint={detourWaypoint}
        pois={pois} poisEnabled={poisEnabled}
        onMapClick={handleMapClick}
        onRouteClick={handleRouteClick}
      />
    </div>
  )
}
