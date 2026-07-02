import express from 'express'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApi } from './api.js'

const here = dirname(fileURLToPath(import.meta.url))
const app = express()

// API routes (/api/*)
app.use(createApi())

// Static files from Vite build
app.use(express.static(join(here, '..', 'dist')))

// SPA fallback — all non-API routes serve index.html
app.use((_req, res) => {
  res.sendFile(join(here, '..', 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
