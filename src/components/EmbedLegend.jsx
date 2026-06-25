export default function EmbedLegend({ loading }) {
  return (
    <div className="embed-legend">
      <div className="embed-legend-title">
        Temps d'accès
        {loading && <span className="loading-dot" />}
      </div>
      {[['≤ 5 min', '#00aa44'], ['≤ 10 min', '#88dd00'], ['≤ 15 min', '#ffcc00'], ['≤ 20 min', '#ff6600'], ['> 20 min', '#cc2200']].map(([label, color]) => (
        <div key={label} className="embed-legend-step">
          <span className="embed-legend-swatch" style={{ background: color }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
