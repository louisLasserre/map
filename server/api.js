import express from 'express'
import { db } from './db.js'

async function fetchOverpassStreets() {
  const query = `[out:json][timeout:30][bbox:44.78,-0.65,44.90,-0.52];
(way["highway"~"^(primary|secondary|tertiary|residential|living_street)$"]["name"];);
out geom;`

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(35000),
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)

  const data = await res.json()
  return {
    type: 'FeatureCollection',
    features: data.elements
      .filter(el => el.type === 'way' && el.geometry?.length >= 2)
      .map(way => ({
        type: 'Feature',
        properties: { id: way.id, name: way.tags?.name ?? '', highway: way.tags?.highway ?? '' },
        geometry: { type: 'LineString', coordinates: way.geometry.map(n => [n.lon, n.lat]) },
      })),
  }
}

// Grid fallback if Overpass is unreachable
function fallbackStreets() {
  const cx = -0.5792, cy = 44.8378
  const features = []
  for (let i = -10; i <= 10; i++) {
    features.push({
      type: 'Feature',
      properties: { name: `Rue ${i >= 0 ? '+' : ''}${i}`, highway: 'residential', id: `h${i}` },
      geometry: { type: 'LineString', coordinates: [[cx - 0.07, cy + i * 0.0025], [cx + 0.07, cy + i * 0.0025]] },
    })
  }
  for (let i = -10; i <= 10; i++) {
    features.push({
      type: 'Feature',
      properties: { name: `Avenue ${i >= 0 ? '+' : ''}${i}`, highway: 'secondary', id: `v${i}` },
      geometry: { type: 'LineString', coordinates: [[cx + i * 0.006, cy - 0.06], [cx + i * 0.006, cy + 0.06]] },
    })
  }
  return { type: 'FeatureCollection', features }
}

export function createApi() {
  const app = express()
  app.use(express.json())

  app.get('/api/notes', (_req, res) => {
    const rows = db.prepare('SELECT id, body, created_at FROM notes ORDER BY id DESC').all()
    res.json(rows)
  })

  app.post('/api/notes', (req, res) => {
    const body = (req.body?.body ?? '').toString().trim()
    if (!body) return res.status(400).json({ error: 'body is required' })
    const { lastInsertRowid } = db.prepare('INSERT INTO notes (body) VALUES (?)').run(body)
    const note = db.prepare('SELECT id, body, created_at FROM notes WHERE id = ?').get(lastInsertRowid)
    res.status(201).json(note)
  })

  app.delete('/api/notes/:id', (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid id' })
    const info = db.prepare('DELETE FROM notes WHERE id = ?').run(id)
    if (info.changes === 0) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  })

  app.get('/api/pois', (req, res) => {
    const { category } = req.query
    if (!category) return res.status(400).json({ error: 'category required' })
    const rows = db.prepare('SELECT id, name, category, lat, lng FROM pois WHERE category = ?').all(category)
    res.json(rows)
  })

  app.get('/api/streets', async (req, res) => {
    const TTL = 24 * 60 * 60 * 1000
    const cached = db.prepare('SELECT geojson, fetched_at FROM streets_cache WHERE id = 1').get()
    if (cached && Date.now() - cached.fetched_at < TTL) {
      return res.type('json').send(cached.geojson)
    }

    let geojson
    try {
      geojson = await fetchOverpassStreets()
      console.log(`Overpass: ${geojson.features.length} streets loaded`)
    } catch (err) {
      console.warn('Overpass failed, using fallback:', err.message)
      geojson = fallbackStreets()
    }

    const json = JSON.stringify(geojson)
    db.prepare('INSERT OR REPLACE INTO streets_cache (id, fetched_at, geojson) VALUES (1, ?, ?)').run(Date.now(), json)
    res.type('json').send(json)
  })

  return app
}
