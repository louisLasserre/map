import { useEffect, useState } from 'react'
import Map from './components/Map.jsx'
import POISelector from './components/POISelector.jsx'
import './index.css'

export default function App() {
  const [selected,  setSelected]  = useState(['hospital'])
  const [mode,      setMode]      = useState('foot-walking')
  const [streets,   setStreets]   = useState(null)
  const [pois,      setPois]      = useState({})
  const [isochrones,  setIsochrones]  = useState({})
  const [isoLoading,  setIsoLoading]  = useState(false)
  const [apiError,    setApiError]    = useState(null)
  const [streetsState, setStreetsState] = useState('loading')
  const [streetsMsg,   setStreetsMsg]   = useState('')

  // Load streets once
  useEffect(() => {
    fetch('/api/streets')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => { setStreets(data); setStreetsState('ok') })
      .catch(e => { setStreetsState('error'); setStreetsMsg(e.message) })
  }, [])

  // Load POI markers when selection changes
  useEffect(() => {
    if (selected.length === 0) { setPois({}); return }
    Promise.all(
      selected.map(cat =>
        fetch(`/api/pois?category=${cat}`).then(r => r.json()).then(d => [cat, d])
      )
    ).then(results => setPois(Object.fromEntries(results)))
  }, [selected])

  // Load isochrones when selection or transport mode changes
  useEffect(() => {
    if (selected.length === 0) { setIsochrones({}); setApiError(null); return }
    setIsoLoading(true)
    setApiError(null)
    Promise.all(
      selected.map(cat =>
        fetch(`/api/isochrones?category=${cat}&mode=${mode}`)
          .then(r => r.json())
          .then(data => {
            if (data.error) throw data
            return [cat, data]
          })
      )
    )
      .then(results => {
        setIsochrones(Object.fromEntries(results))
        setIsoLoading(false)
      })
      .catch(err => {
        setApiError(err)
        setIsoLoading(false)
      })
  }, [selected, mode])

  return (
    <div className="app-layout">
      <POISelector
        selected={selected}
        mode={mode}
        onModeChange={setMode}
        onChange={setSelected}
        loading={isoLoading}
        apiError={apiError}
      />
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
        <Map streets={streets} isochrones={isochrones} pois={pois} mode={mode} />
      </div>
    </div>
  )
}
