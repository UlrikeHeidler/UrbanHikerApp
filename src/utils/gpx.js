/**
 * Build a GPX XML string from a route.
 *
 * Produces a single `<trk>` with one `<trkseg>` containing one `<trkpt>` per
 * coordinate pair. Coordinates must be Leaflet-style [lat, lng].
 *
 * @param {[number, number][]} coordinates - Ordered [lat, lng] pairs
 * @param {string} name - Track name embedded in the GPX file
 * @returns {string} Well-formed GPX 1.1 XML string
 */
export function buildGpx(coordinates, name) {
  const trackPoints = coordinates
    .map(([lat, lng]) => `    <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Urban Hiker" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`
}

/**
 * Generate a GPX file from the current route and trigger a browser download.
 *
 * @param {[number, number][]} coordinates - Ordered [lat, lng] pairs
 * @param {string} name - Used as the track name and the downloaded filename
 */
export function downloadGpx(coordinates, name) {
  const xml = buildGpx(coordinates, name)
  const blob = new Blob([xml], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/[^a-z0-9_\-. ]/gi, '_')}.gpx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Escape characters that are unsafe inside XML text and attribute values.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
