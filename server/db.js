import Database from 'better-sqlite3'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// data.db lives at the workspace root, which is the /home/dev volume — so the
// database survives container restarts and image upgrades.
const here = dirname(fileURLToPath(import.meta.url))
const dbPath = join(here, '..', 'data.db')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    body        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pois (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    lat         REAL    NOT NULL,
    lng         REAL    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS streets_cache (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    fetched_at  INTEGER NOT NULL,
    geojson     TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS isochrones_cache (
    category    TEXT    NOT NULL,
    mode        TEXT    NOT NULL,
    geojson     TEXT    NOT NULL,
    fetched_at  INTEGER NOT NULL,
    PRIMARY KEY (category, mode)
  );
`)

const poiCount = db.prepare('SELECT COUNT(*) as n FROM pois').get()
if (poiCount.n === 0) {
  const ins = db.prepare('INSERT INTO pois (name, category, lat, lng) VALUES (?, ?, ?, ?)')
  const seed = db.transaction(rows => { for (const r of rows) ins.run(...r) })
  seed([
    // Hôpitaux
    ['CHU Pellegrin',                 'hospital',     44.8284, -0.5982],
    ['Hôpital Saint-André',           'hospital',     44.8357, -0.5750],
    ['Clinique Saint-Augustin',       'hospital',     44.8231, -0.6046],
    ['CHU Haut-Lévêque',              'hospital',     44.7879, -0.5878],
    ['Clinique Bordeaux Nord',        'hospital',     44.8657, -0.5711],
    ['Hôpital Xavier Arnozan',        'hospital',     44.8031, -0.5845],
    ['Clinique du Tondu',             'hospital',     44.8273, -0.5873],
    // Police
    ['Commissariat Central',          'police',       44.8378, -0.5736],
    ['Police Bordeaux Bastide',       'police',       44.8352, -0.5540],
    ['Commissariat Bordeaux Nord',    'police',       44.8580, -0.5680],
    ['Police Bordeaux Sud',           'police',       44.8180, -0.5760],
    ['Gendarmerie Mérignac',          'police',       44.8360, -0.6430],
    // Parcs
    ['Jardin Public',                 'park',         44.8438, -0.5800],
    ['Parc Bordelais',                'park',         44.8503, -0.5983],
    ['Esplanade des Quinconces',      'park',         44.8443, -0.5738],
    ['Parc de Bourran',               'park',         44.8399, -0.5942],
    ['Parc Rivière',                  'park',         44.8340, -0.5850],
    ['Bois de Bordeaux',              'park',         44.8582, -0.5711],
    ['Parc de la Chêneraie',          'park',         44.8230, -0.5820],
    ['Jardin Botanique',              'park',         44.8404, -0.5547],
    ['Parc Peixotto',                 'park',         44.8083, -0.5983],
    // Pompiers
    ['CS Mériadeck',                  'fire_station', 44.8360, -0.5795],
    ['CS La Bastide',                 'fire_station', 44.8400, -0.5521],
    ['CS Bordeaux Sud',               'fire_station', 44.8201, -0.5762],
    ['CS Bordeaux Maritime',          'fire_station', 44.8580, -0.5632],
    ['CS Caudéran',                   'fire_station', 44.8420, -0.5980],
    // Écoles / Universités
    ['Université Bordeaux Campus',    'school',       44.8083, -0.5955],
    ['Sciences Po Bordeaux',          'school',       44.8302, -0.5793],
    ['Campus Victoire',               'school',       44.8261, -0.5744],
    ['ENSEIRB-MATMECA',               'school',       44.8055, -0.5983],
    ['IUT Bordeaux',                  'school',       44.8285, -0.5895],
    ['Lycée Montaigne',               'school',       44.8353, -0.5762],
    ['Lycée Longchamp',               'school',       44.8421, -0.5865],
    // Points d'eau
    ['Station de traitement Bordeaux', 'water',       44.8530, -0.5490],
    ['Réservoir Béquet',              'water',        44.8620, -0.5890],
    ['Station Lormont',               'water',        44.8710, -0.5150],
    ['Réservoir Caudéran',            'water',        44.8480, -0.5970],
    ['Station Bouliac',               'water',        44.8100, -0.5300],
  ])
}
