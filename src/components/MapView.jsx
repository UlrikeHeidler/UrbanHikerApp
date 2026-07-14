import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

// Fix Leaflet's default icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const startIcon = makeColorIcon('green')
const endIcon   = makeColorIcon('red')
const waypointIcon = makeColorIcon('violet')

/** @type {Record<string, { color: string, label: string }>} */
const POI_STYLE = {
  bench:     { color: '#16a34a', label: '🪑 Bench' },
  water:     { color: '#2563eb', label: '💧 Water' },
  viewpoint: { color: '#9333ea', label: '🔭 Viewpoint' },
}

/**
 * Create a Leaflet Icon using the pointhi color-marker CDN.
 *
 * @param {string} color - One of the supported marker colors
 * @returns {L.Icon}
 */
function makeColorIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
  })
}

/** Forwards map click events to the parent. */
function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}

/**
 * Full-screen interactive map. Displays start/end/waypoint markers, the route
 * polyline, POI overlay, and forwards click events to the parent.
 *
 * @param {object}   props
 * @param {object}   props.startPoint  - {lat, lng} or null
 * @param {object}   props.endPoint    - {lat, lng} or null
 * @param {Array}    props.route       - [lat, lng] pairs or null
 * @param {string}   props.mode        - 'a-to-b' | 'loop'
 * @param {string}   props.activePin   - 'start' | 'end' | 'waypoint'
 * @param {object[]} props.waypoints   - Array of {lat, lng}
 * @param {object}   props.pois        - { bench: PoiNode[], water: PoiNode[], viewpoint: PoiNode[] }
 * @param {object}   props.poisEnabled - { bench: boolean, water: boolean, viewpoint: boolean }
 * @param {Function} props.onMapClick  - Called with Leaflet LatLng on click
 */
export default function MapView({
  startPoint, endPoint, route, mode, activePin,
  waypoints = [], pois = {}, poisEnabled = {},
  onMapClick,
}) {
  const defaultCenter = [38.8737, -77.2311] // Merrifield, Virginia

  function getHint() {
    if (activePin === 'waypoint') return 'Click on the map to place a waypoint'
    if (mode === 'loop') return 'Click on the map to set the loop start point'
    return activePin === 'start'
      ? 'Click on the map to set the start point'
      : 'Click on the map to set the end point'
  }

  return (
    <div className="map-wrapper">
      <div className="map-hint">{getHint()}</div>
      <MapContainer center={defaultCenter} zoom={13} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onMapClick={onMapClick} />

        {startPoint && <Marker position={startPoint} icon={startIcon}><Popup>Start</Popup></Marker>}
        {endPoint   && <Marker position={endPoint}   icon={endIcon}>  <Popup>End</Popup>  </Marker>}

        {waypoints.map((wp, i) => (
          <Marker key={i} position={wp} icon={waypointIcon}>
            <Popup>Waypoint {i + 1}</Popup>
          </Marker>
        ))}

        {route && (
          <Polyline positions={route} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8 }} />
        )}

        {Object.entries(pois).map(([type, nodes]) =>
          poisEnabled[type]
            ? nodes.map((node) => (
                <CircleMarker
                  key={node.id}
                  center={[node.lat, node.lon]}
                  radius={6}
                  pathOptions={{ color: POI_STYLE[type]?.color, fillColor: POI_STYLE[type]?.color, fillOpacity: 0.8 }}
                >
                  <Popup>{POI_STYLE[type]?.label}{node.name ? ` — ${node.name}` : ''}</Popup>
                </CircleMarker>
              ))
            : null
        )}
      </MapContainer>
    </div>
  )
}
