const CATEGORIES = [
  { key: 'hospital',     label: 'Hôpitaux',     icon: '🏥', color: '#e74c3c' },
  { key: 'police',       label: 'Police',        icon: '🚔', color: '#3498db' },
  { key: 'park',         label: 'Parcs',         icon: '🌳', color: '#27ae60' },
  { key: 'fire_station', label: 'Pompiers',      icon: '🚒', color: '#e67e22' },
  { key: 'school',       label: 'Écoles',        icon: '🎓', color: '#9b59b6' },
  { key: 'water',        label: "Points d'eau",  icon: '💧', color: '#1abc9c' },
]

const MODES = [
  { key: 'foot-walking',    label: 'Pied',    icon: '🚶' },
  { key: 'cycling-regular', label: 'Vélo',    icon: '🚲' },
  { key: 'driving-car',     label: 'Voiture', icon: '🚗' },
]

const LEGEND_BY_MODE = {
  'foot-walking':    [['≤ 5 min', '#00aa44'], ['≤ 10 min', '#88dd00'], ['≤ 15 min', '#ffcc00'], ['≤ 20 min', '#ff6600'], ['> 20 min', '#cc2200']],
  'cycling-regular': [['≤ 3 min', '#00aa44'], ['≤ 5 min',  '#88dd00'], ['≤ 10 min', '#ffcc00'], ['≤ 15 min', '#ff6600'], ['> 15 min', '#cc2200']],
  'driving-car':     [['≤ 1 min', '#00aa44'], ['≤ 2 min',  '#88dd00'], ['≤ 3 min',  '#ffcc00'], ['≤ 5 min',  '#ff6600'], ['> 5 min',  '#cc2200']],
}

export default function POISelector({ selected, mode, onModeChange, onChange, loading, apiError }) {
  function toggle(key) {
    onChange(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🗺</span>
          <span className="sidebar-logo-text">Bordeaux</span>
        </div>
        <p className="sidebar-sub">Couverture des services</p>
      </div>

      <div className="sidebar-section-label">Mode de transport</div>
      <div className="mode-selector">
        {MODES.map(m => (
          <button
            key={m.key}
            className={`mode-btn${mode === m.key ? ' active' : ''}`}
            onClick={() => onModeChange(m.key)}
            title={m.label}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {apiError && (
        <div className="api-error">
          {apiError.error === 'no_api_key'
            ? <><strong>Clé ORS manquante</strong><br/>{apiError.message}</>
            : <><strong>Erreur ORS</strong><br/>{apiError.message}</>
          }
        </div>
      )}

      <div className="sidebar-section-label">
        Services
        {loading && <span className="loading-dot" />}
      </div>
      <div className="categories">
        {CATEGORIES.map(cat => {
          const active = selected.includes(cat.key)
          return (
            <button
              key={cat.key}
              className={`cat-btn${active ? ' active' : ''}`}
              style={{ '--c': cat.color }}
              onClick={() => toggle(cat.key)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-label">{cat.label}</span>
              <span className={`cat-pill${active ? ' on' : ''}`} />
            </button>
          )
        })}
      </div>

      <div className="legend">
        <div className="legend-title">Temps d'accès</div>
        <div className="legend-steps">
          {(LEGEND_BY_MODE[mode] ?? LEGEND_BY_MODE['foot-walking']).map(([label, color]) => (
            <div key={label} className="legend-step">
              <span className="legend-swatch" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
