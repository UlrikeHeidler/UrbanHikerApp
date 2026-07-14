import { useState } from 'react'
import RouteInfo from './RouteInfo'
import ElevationProfile from './ElevationProfile'
import SaveRouteForm from './SaveRouteForm'
import PoiControls from './PoiControls'
import { downloadGpx } from '../utils/gpx'
import './RouteResultPanel.css'

/**
 * Panel shown below the route controls once a route has been generated.
 * Contains route stats, elevation chart, save form, GPX export, and POI controls.
 *
 * @param {object}   props
 * @param {object}   props.routeInfo
 * @param {Array}    props.elevationProfile
 * @param {Array}    props.coordinates        - Route coordinates for GPX export
 * @param {Function} props.onSaveRoute        - Called with route name string
 * @param {{ bench: boolean, water: boolean, viewpoint: boolean }} props.poisEnabled
 * @param {Function} props.onTogglePoi        - Called with PoiType string
 * @param {Function} props.onLoadPois         - Triggers Overpass fetch
 * @param {boolean}  props.poisLoading
 */
export default function RouteResultPanel({
  routeInfo, elevationProfile, coordinates,
  onSaveRoute,
  poisEnabled, onTogglePoi, onLoadPois, poisLoading,
}) {
  const [isSaved, setIsSaved] = useState(false)

  function handleSave(name) {
    onSaveRoute(name)
    setIsSaved(true)
  }

  function handleExportGpx() {
    const name = `urban-hike-${new Date().toISOString().slice(0, 10)}`
    downloadGpx(coordinates, name)
  }

  return (
    <div className="route-result-panel">
      <RouteInfo info={routeInfo} />
      <ElevationProfile profile={elevationProfile} />

      <div className="result-actions">
        <SaveRouteForm onSave={handleSave} isSaved={isSaved} />
        <button className="gpx-btn" onClick={handleExportGpx} title="Download GPX">
          ↓ GPX
        </button>
      </div>

      <PoiControls
        enabled={poisEnabled}
        onToggle={onTogglePoi}
        onLoad={onLoadPois}
        isLoading={poisLoading}
        hasRoute={Boolean(coordinates?.length)}
      />
    </div>
  )
}
