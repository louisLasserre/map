import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAX_DISTANCE = 1500 // metres

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function colorStreets(streets, allPois) {
  const noData = allPois.length === 0
  return {
    ...streets,
    features: streets.features.map(feature => {
      const coords = feature.geometry.coordinates
      const mid = [
        (coords[0][0] + coords[coords.length - 1][0]) / 2,
        (coords[0][1] + coords[coords.length - 1][1]) / 2,
      ]

      let score = 0
      if (!noData) {
        let minDist = Infinity
        for (const poi of allPois) {
          const d = haversine(mid[1], mid[0], poi.lat, poi.lng)
          if (d < minDist) minDist = d
        }
        score = Math.max(0, 1 - minDist / MAX_DISTANCE)
      }

      return { ...feature, properties: { ...feature.properties, score, noData } }
    }),
  }
}

function setupMap(map) {
  map.addSource('streets', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addSource('pois', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

  map.addLayer({
    id: 'streets-coverage',
    type: 'line',
    source: 'streets',
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 15, 4],
      'line-color': [
        'case',
        ['boolean', ['get', 'noData'], true],
        '#3a3a5c',
        [
          'interpolate', ['linear'], ['coalesce', ['get', 'score'], 0],
          0,    '#cc2200',
          0.25, '#ff6600',
          0.5,  '#ffcc00',
          0.75, '#88dd00',
          1.0,  '#00aa44',
        ],
      ],
      'line-opacity': ['case', ['boolean', ['get', 'noData'], true], 0.35, 1],
    },
  })

  // POI halo
  map.addLayer({
    id: 'pois-halo',
    type: 'circle',
    source: 'pois',
    paint: {
      'circle-radius': 14,
      'circle-color': ['match', ['get', 'category'],
        'hospital',     '#e74c3c',
        'police',       '#3498db',
        'park',         '#27ae60',
        'fire_station', '#e67e22',
        'school',       '#9b59b6',
        'water',        '#1abc9c',
        '#888',
      ],
      'circle-opacity': 0.15,
      'circle-blur': 1,
    },
  })

  // POI dot
  map.addLayer({
    id: 'pois-dot',
    type: 'circle',
    source: 'pois',
    paint: {
      'circle-radius': 5,
      'circle-color': ['match', ['get', 'category'],
        'hospital',     '#e74c3c',
        'police',       '#3498db',
        'park',         '#27ae60',
        'fire_station', '#e67e22',
        'school',       '#9b59b6',
        'water',        '#1abc9c',
        '#888',
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  })

  // Tooltip
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

function applyData(map, streets, pois) {
  const allPois = Object.values(pois).flat()
  map.getSource('streets')?.setData(colorStreets(streets, allPois))
  map.getSource('pois')?.setData({
    type: 'FeatureCollection',
    features: allPois.map(p => ({
      type: 'Feature',
      properties: { name: p.name, category: p.category },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    })),
  })
}

export default function Map({ streets, pois }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const latestRef = useRef({ streets, pois })

  useEffect(() => {
    latestRef.current = { streets, pois }
    const map = mapRef.current
    if (!map || !streets) return
    if (map.isStyleLoaded()) applyData(map, streets, pois)
  }, [streets, pois])

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
      const { streets, pois } = latestRef.current
      if (streets) applyData(map, streets, pois)
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
