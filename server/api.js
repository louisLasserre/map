import express from 'express'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './db.js'

const here = dirname(fileURLToPath(import.meta.url))
const STREETS_GEOJSON = readFileSync(join(here, 'bordeaux-streets.json'), 'utf8')

// Load ORS API key from .env if not already in process.env
try {
  const envFile = readFileSync(join(here, '..', '.env'), 'utf8')
  for (const line of envFile.split('\n')) {
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
} catch {}

const ORS_RANGES = [300, 600, 900, 1200] // 5, 10, 15, 20 min — same scale for all modes

async function fetchOrsIsochrones(locations, mode, apiKey) {
  const res = await fetch(`https://api.openrouteservice.org/v2/isochrones/${mode}`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/geo+json',
    },
    body: JSON.stringify({
      locations,
      range: ORS_RANGES,
      range_type: 'time',
      smoothing: 25,
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ORS ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
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

  app.get('/api/streets', (_req, res) => {
    res.type('json').send(STREETS_GEOJSON)
  })

  // Returns isochrone polygons per POI for a category + transport mode.
  // Caches permanently in SQLite (street network doesn't change).
  app.get('/api/isochrones', async (req, res) => {
    const { category, mode } = req.query
    if (!category || !mode) return res.status(400).json({ error: 'category and mode required' })

    const apiKey = process.env.ORS_API_KEY
    if (!apiKey) {
      return res.status(503).json({
        error: 'no_api_key',
        message: 'Crée une clé gratuite sur openrouteservice.org puis ajoute ORS_API_KEY=ta_clé dans le fichier .env du projet.',
      })
    }

    // Check cache
    const cached = db.prepare('SELECT geojson FROM isochrones_cache WHERE category = ? AND mode = ?').get(category, mode)
    if (cached) return res.type('json').send(cached.geojson)

    // Fetch all POIs for this category
    const pois = db.prepare('SELECT id, name, lat, lng FROM pois WHERE category = ?').all(category)
    if (pois.length === 0) return res.json({ pois: [] })

    try {
      // ORS free plan: max 5 locations per request — batch accordingly
      const BATCH = 5
      const allFeatures = []
      let globalIndex = 0
      for (let i = 0; i < pois.length; i += BATCH) {
        const batch = pois.slice(i, i + BATCH)
        const locations = batch.map(p => [p.lng, p.lat])
        const orsData = await fetchOrsIsochrones(locations, mode, apiKey)
        for (const feat of orsData.features) {
          allFeatures.push({ ...feat, properties: { ...feat.properties, group_index: feat.properties.group_index + globalIndex } })
        }
        globalIndex += batch.length
      }

      // Restructure: group features by global group_index, sort bands ascending
      const grouped = {}
      for (const feat of allFeatures) {
        const gi = feat.properties.group_index
        if (!grouped[gi]) grouped[gi] = []
        grouped[gi].push({ mins: feat.properties.value / 60, geometry: feat.geometry })
      }

      const result = {
        mode,
        pois: pois.map((p, i) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          bands: (grouped[i] ?? []).sort((a, b) => a.mins - b.mins),
        })),
      }

      const json = JSON.stringify(result)
      db.prepare('INSERT OR REPLACE INTO isochrones_cache (category, mode, geojson, fetched_at) VALUES (?, ?, ?, ?)')
        .run(category, mode, json, Date.now())

      res.type('json').send(json)
    } catch (err) {
      console.error('ORS error:', err.message)
      res.status(502).json({ error: 'ors_failed', message: err.message })
    }
  })

  // Clear isochrone cache for a specific category+mode (useful for refresh)
  app.delete('/api/isochrones', (req, res) => {
    const { category, mode } = req.query
    if (category && mode) {
      db.prepare('DELETE FROM isochrones_cache WHERE category = ? AND mode = ?').run(category, mode)
    } else {
      db.prepare('DELETE FROM isochrones_cache').run()
    }
    res.status(204).end()
  })

  return app
}
