const CATEGORIES = [
  { key: 'hospital',     label: 'Hôpitaux',       icon: '🏥', color: '#e74c3c' },
  { key: 'police',       label: 'Police',          icon: '🚔', color: '#3498db' },
  { key: 'park',         label: 'Parcs',           icon: '🌳', color: '#27ae60' },
  { key: 'fire_station', label: 'Pompiers',        icon: '🚒', color: '#e67e22' },
  { key: 'school',       label: 'Écoles',          icon: '🎓', color: '#9b59b6' },
  { key: 'water',        label: "Points d'eau",    icon: '💧', color: '#1abc9c' },
]

export default function POISelector({ selected, onChange }) {
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

      <div className="sidebar-section-label">Services</div>
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
        <div className="legend-title">Couverture</div>
        <div className="legend-bar" />
        <div className="legend-labels">
          <span>Excellente</span>
          <span>Aucune</span>
        </div>
        <div className="legend-note">Rayon max : 1,5 km</div>
      </div>
    </aside>
  )
}
