import express from 'express'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './db.js'

const here = dirname(fileURLToPath(import.meta.url))
const STREETS_GEOJSON = readFileSync(join(here, 'bordeaux-streets.json'), 'utf8')

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

  return app
}
