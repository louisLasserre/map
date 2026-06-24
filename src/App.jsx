import { useEffect, useState } from 'react'
import Map from './components/Map.jsx'
import POISelector from './components/POISelector.jsx'
import './index.css'

export default function App() {
  const [selected, setSelected] = useState(['hospital'])
  const [streets, setStreets] = useState(null)
  const [pois, setPois] = useState({})
  const [streetsState, setStreetsState] = useState('loading') // 'loading' | 'ok' | 'error'
  const [streetsMsg, setStreetsMsg] = useState('')

  useEffect(() => {
    fetch('/api/streets')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => {
        setStreets(data)
        setStreetsState('ok')
      })
      .catch(e => {
        setStreetsState('error')
        setStreetsMsg(e.message)
      })
  }, [])

  useEffect(() => {
    if (selected.length === 0) { setPois({}); return }
    Promise.all(
      selected.map(cat =>
        fetch(`/api/pois?category=${cat}`)
          .then(r => r.json())
          .then(data => [cat, data])
      )
    ).then(results => setPois(Object.fromEntries(results)))
  }, [selected])

  return (
    <div className="app-layout">
      <POISelector selected={selected} onChange={setSelected} />
      <div className="map-area">
        {streetsState === 'loading' && (
          <div className="map-overlay">
            <div className="map-status">
              <div className="spinner" />
              Chargement des rues de Bordeaux…
            </div>
          </div>
        )}
        {streetsState === 'error' && (
          <div className="map-overlay">
            <div className="map-status error">Erreur : {streetsMsg}</div>
          </div>
        )}
        <Map streets={streets} pois={pois} />
      </div>
    </div>
  )
}
