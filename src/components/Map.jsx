import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// ── Point-in-polygon (ray casting) ───────────────────────────────────────────

function pointInRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

function pointInGeometry(point, geom) {
  if (geom.type === 'Polygon') return pointInRing(point, geom.coordinates[0])
  if (geom.type === 'MultiPolygon') return geom.coordinates.some(poly => pointInRing(point, poly[0]))
  return false
}

// Returns the minimum travel time in minutes from point to any POI in the list.
// poisWithBands: [{id, name, bands: [{mins, geometry}...sorted asc]}]
// Returns Infinity if outside all isochrones.
function getMinMins(point, poisWithBands) {
  let min = Infinity
  for (const poi of poisWithBands) {
    for (const band of poi.bands) {
      if (pointInGeometry(point, band.geometry)) {
        if (band.mins < min) min = band.mins
        break // found tightest band for this POI
      }
    }
  }
  return min
}

// ── Street coloring ───────────────────────────────────────────────────────────

function colorStreets(streets, allPoisWithBands) {
  const noData = allPoisWithBands.length === 0
  return {
    ...streets,
    features: streets.features.map(feature => {
      const coords = feature.geometry.coordinates
      const mid = [
        (coords[0][0] + coords[coords.length - 1][0]) / 2,
        (coords[0][1] + coords[coords.length - 1][1]) / 2,
      ]
      const mins = noData ? -1 : Math.min(getMinMins(mid, allPoisWithBands), 25)
      return { ...feature, properties: { ...feature.properties, mins } }
    }),
  }
}

// ── MapLibre setup ────────────────────────────────────────────────────────────

function setupMap(map) {
  map.addSource('streets', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addSource('pois',    { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

  map.addLayer({
    id: 'streets-coverage',
    type: 'line',
    source: 'streets',
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 15, 4],
      'line-color': [
        'case',
        ['==', ['get', 'mins'], -1], '#3a3a5c',   // no category selected
        ['<=', ['get', 'mins'], 5],  '#00aa44',   // ≤ 5 min
        ['<=', ['get', 'mins'], 10], '#88dd00',   // ≤ 10 min
        ['<=', ['get', 'mins'], 15], '#ffcc00',   // ≤ 15 min
        ['<=', ['get', 'mins'], 20], '#ff6600',   // ≤ 20 min
        '#cc2200',                                // > 20 min
      ],
      'line-opacity': ['case', ['==', ['get', 'mins'], -1], 0.25, 1],
    },
  })

  map.addLayer({
    id: 'pois-halo',
    type: 'circle',
    source: 'pois',
    paint: {
      'circle-radius': 14,
      'circle-color': ['match', ['get', 'category'],
        'hospital', '#e74c3c', 'police', '#3498db', 'park', '#27ae60',
        'fire_station', '#e67e22', 'school', '#9b59b6', 'water', '#1abc9c', '#888'],
      'circle-opacity': 0.15,
      'circle-blur': 1,
    },
  })

  map.addLayer({
    id: 'pois-dot',
    type: 'circle',
    source: 'pois',
    paint: {
      'circle-radius': 5,
      'circle-color': ['match', ['get', 'category'],
        'hospital', '#e74c3c', 'police', '#3498db', 'park', '#27ae60',
        'fire_station', '#e67e22', 'school', '#9b59b6', 'water', '#1abc9c', '#888'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  })

  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'map-popup' })
  map.on('mouseenter', 'pois-dot', e => {
    map.getCanvas().style.cursor = 'pointer'
    const { name } = e.features[0].properties
    popup.setLngLat(e.lngLat).setHTML(`<strong>${name}</strong>`).addTo(map)
  })
  map.on('mouseleave', 'pois-dot', () => {
    map.getCanvas().style.cursor = ''
    popup.remove()
  })
}

function applyData(map, streets, isochrones, pois) {
  // Flatten all selected POIs with their isochrone bands
  const allPoisWithBands = Object.values(isochrones).flatMap(iso => iso.pois ?? [])
  map.getSource('streets')?.setData(colorStreets(streets, allPoisWithBands))

  // POI markers (from raw pois, not isochrones, since we always have them)
  const allPois = Object.values(pois).flat()
  map.getSource('pois')?.setData({
    type: 'FeatureCollection',
    features: allPois.map(p => ({
      type: 'Feature',
      properties: { name: p.name, category: p.category },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Map({ streets, isochrones, pois }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const latestRef    = useRef({ streets, isochrones, pois })

  useEffect(() => {
    latestRef.current = { streets, isochrones, pois }
    const map = mapRef.current
    if (!map || !streets) return
    if (map.isStyleLoaded()) applyData(map, streets, isochrones, pois)
  }, [streets, isochrones, pois])

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-0.5792, 44.8378],
      zoom: 13,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right')

    map.on('load', () => {
      setupMap(map)
      const { streets, isochrones, pois } = latestRef.current
      if (streets) applyData(map, streets, isochrones, pois)
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
