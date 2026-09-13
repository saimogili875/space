export default function ArchDiagram({ onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">System Architecture</h2>
            <p className="text-xs text-text-muted">MangaLens — AI-Powered Manganese Intelligence Platform</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg border border-border">Close</button>
        </div>

        <svg viewBox="0 0 900 520" className="w-full" style={{ fontFamily: 'system-ui, sans-serif' }}>
          {/* Background */}
          <rect width="900" height="520" fill="none" />

          {/* Layer labels */}
          <text x="12" y="28" fontSize="11" fill="#94a3b8" fontWeight="600" letterSpacing="1">DATA SOURCES</text>
          <text x="12" y="168" fontSize="11" fill="#94a3b8" fontWeight="600" letterSpacing="1">PROCESSING PIPELINE</text>
          <text x="12" y="328" fontSize="11" fill="#94a3b8" fontWeight="600" letterSpacing="1">AI/ML ENGINE</text>
          <text x="12" y="448" fontSize="11" fill="#94a3b8" fontWeight="600" letterSpacing="1">APPLICATION LAYER</text>

          {/* Horizontal dividers */}
          <line x1="0" y1="150" x2="900" y2="150" stroke="#e2e8f0" strokeDasharray="4 4" />
          <line x1="0" y1="310" x2="900" y2="310" stroke="#e2e8f0" strokeDasharray="4 4" />
          <line x1="0" y1="435" x2="900" y2="435" stroke="#e2e8f0" strokeDasharray="4 4" />

          {/* === DATA SOURCES === */}
          {/* Sentinel-2 */}
          <rect x="30" y="50" width="160" height="80" rx="10" fill="#1a365d" />
          <text x="110" y="80" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">Sentinel-2</text>
          <text x="110" y="98" textAnchor="middle" fill="#93c5fd" fontSize="10">B2-B12 Bands</text>
          <text x="110" y="112" textAnchor="middle" fill="#93c5fd" fontSize="10">10m Resolution</text>

          {/* MOIL Production */}
          <rect x="230" y="50" width="160" height="80" rx="10" fill="#1a365d" />
          <text x="310" y="80" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">MOIL Production</text>
          <text x="310" y="98" textAnchor="middle" fill="#93c5fd" fontSize="10">10 Mines Data</text>
          <text x="310" y="112" textAnchor="middle" fill="#93c5fd" fontSize="10">Monthly Tonnage</text>

          {/* Weather / IMD */}
          <rect x="430" y="50" width="160" height="80" rx="10" fill="#1a365d" />
          <text x="510" y="80" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">Weather / IMD</text>
          <text x="510" y="98" textAnchor="middle" fill="#93c5fd" fontSize="10">Rainfall, Temp</text>
          <text x="510" y="112" textAnchor="middle" fill="#93c5fd" fontSize="10">Soil Moisture, NDVI</text>

          {/* Equipment */}
          <rect x="630" y="50" width="160" height="80" rx="10" fill="#1a365d" />
          <text x="710" y="80" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">Equipment Data</text>
          <text x="710" y="98" textAnchor="middle" fill="#93c5fd" fontSize="10">Age, Utilization</text>
          <text x="710" y="112" textAnchor="middle" fill="#93c5fd" fontSize="10">Failure Probability</text>

          {/* Arrows down from data sources */}
          <line x1="110" y1="130" x2="110" y2="175" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="310" y1="130" x2="370" y2="175" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="510" y1="130" x2="450" y2="175" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="710" y1="130" x2="610" y2="175" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* === PROCESSING === */}
          {/* GEE / Spectral */}
          <rect x="30" y="175" width="170" height="65" rx="8" fill="#e67e22" />
          <text x="115" y="200" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">GEE Spectral Engine</text>
          <text x="115" y="218" textAnchor="middle" fill="#fde68a" fontSize="10">Band Ratios + PCA</text>
          <text x="115" y="230" textAnchor="middle" fill="#fde68a" fontSize="10">Iron/Hydroxyl/Mn Index</text>

          {/* Feature Engineering */}
          <rect x="240" y="175" width="200" height="65" rx="8" fill="#e67e22" />
          <text x="340" y="200" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Feature Engineering</text>
          <text x="340" y="218" textAnchor="middle" fill="#fde68a" fontSize="10">33 Features: Lags, Rolling, Seasonal</text>
          <text x="340" y="230" textAnchor="middle" fill="#fde68a" fontSize="10">Monsoon, YoY Change</text>

          {/* Anomaly Detection */}
          <rect x="480" y="175" width="180" height="65" rx="8" fill="#e67e22" />
          <text x="570" y="200" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Anomaly Detection</text>
          <text x="570" y="218" textAnchor="middle" fill="#fde68a" fontSize="10">Isolation Forest</text>
          <text x="570" y="230" textAnchor="middle" fill="#fde68a" fontSize="10">Z-Score Analysis</text>

          {/* Data Store */}
          <rect x="700" y="175" width="140" height="65" rx="8" fill="#475569" />
          <text x="770" y="205" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Data Store</text>
          <text x="770" y="223" textAnchor="middle" fill="#cbd5e1" fontSize="10">CSV + JSON + Models</text>

          {/* Arrows down to ML */}
          <line x1="115" y1="240" x2="160" y2="345" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="340" y1="240" x2="340" y2="345" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="340" y1="240" x2="560" y2="345" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="570" y1="240" x2="710" y2="345" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* === ML ENGINE === */}
          {/* Reserve Mapper */}
          <rect x="40" y="345" width="170" height="65" rx="8" fill="#16a34a" />
          <text x="125" y="370" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Reserve Mapper</text>
          <text x="125" y="386" textAnchor="middle" fill="#bbf7d0" fontSize="10">Random Forest (30%)</text>
          <text x="125" y="398" textAnchor="middle" fill="#bbf7d0" fontSize="10">F1: 100% | Heatmaps</text>

          {/* XGBoost */}
          <rect x="250" y="345" width="170" height="65" rx="8" fill="#16a34a" />
          <text x="335" y="370" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">XGBoost</text>
          <text x="335" y="386" textAnchor="middle" fill="#bbf7d0" fontSize="10">R²: 0.992 | MAPE: 3.7%</text>
          <text x="335" y="398" textAnchor="middle" fill="#bbf7d0" fontSize="10">SHAP Explainability</text>

          {/* LSTM */}
          <rect x="460" y="345" width="170" height="65" rx="8" fill="#16a34a" />
          <text x="545" y="370" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">LSTM</text>
          <text x="545" y="386" textAnchor="middle" fill="#bbf7d0" fontSize="10">Seq=6 | Hidden=32</text>
          <text x="545" y="398" textAnchor="middle" fill="#bbf7d0" fontSize="10">Temporal Patterns</text>

          {/* Ensemble */}
          <rect x="335" y="340" width="0" height="0" />
          {/* Actions / Rules */}
          <rect x="670" y="345" width="170" height="65" rx="8" fill="#16a34a" />
          <text x="755" y="370" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Action Engine</text>
          <text x="755" y="386" textAnchor="middle" fill="#bbf7d0" fontSize="10">Rule-Based (20%)</text>
          <text x="755" y="398" textAnchor="middle" fill="#bbf7d0" fontSize="10">Corrective Actions</text>

          {/* Ensemble bracket */}
          <rect x="280" y="415" width="320" height="0" />
          <path d="M300,410 L300,420 L560,420 L560,410" fill="none" stroke="#22c55e" strokeWidth="2" />
          <line x1="430" y1="420" x2="430" y2="445" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrowGreen)" />
          <text x="430" y="434" textAnchor="middle" fill="#16a34a" fontSize="10" fontWeight="700">Ensemble (XGB 60% + LSTM 40%)</text>

          {/* === APP LAYER === */}
          <rect x="30" y="455" width="140" height="50" rx="8" fill="#7c3aed" />
          <text x="100" y="477" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">FastAPI</text>
          <text x="100" y="493" textAnchor="middle" fill="#c4b5fd" fontSize="10">REST API + Docs</text>

          <rect x="200" y="455" width="140" height="50" rx="8" fill="#7c3aed" />
          <text x="270" y="477" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">React Dashboard</text>
          <text x="270" y="493" textAnchor="middle" fill="#c4b5fd" fontSize="10">9 Panels + Live</text>

          <rect x="370" y="455" width="140" height="50" rx="8" fill="#7c3aed" />
          <text x="440" y="477" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">PDF Reports</text>
          <text x="440" y="493" textAnchor="middle" fill="#c4b5fd" fontSize="10">7-Section Intel</text>

          <rect x="540" y="455" width="140" height="50" rx="8" fill="#7c3aed" />
          <text x="610" y="477" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">What-If Sim</text>
          <text x="610" y="493" textAnchor="middle" fill="#c4b5fd" fontSize="10">Scenario Analysis</text>

          <rect x="710" y="455" width="140" height="50" rx="8" fill="#7c3aed" />
          <text x="780" y="477" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">Docker Deploy</text>
          <text x="780" y="493" textAnchor="middle" fill="#c4b5fd" fontSize="10">One-Command</text>

          {/* Arrowhead defs */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker id="arrowGreen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
            </marker>
          </defs>
        </svg>

        <div className="mt-4 grid grid-cols-4 gap-3 text-center text-xs">
          <div className="flex items-center gap-2 justify-center">
            <span className="w-3 h-3 rounded bg-[#1a365d]" /> Data Sources
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-3 h-3 rounded bg-[#e67e22]" /> Processing
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-3 h-3 rounded bg-[#16a34a]" /> AI/ML Models
          </div>
          <div className="flex items-center gap-2 justify-center">
            <span className="w-3 h-3 rounded bg-[#7c3aed]" /> Application
          </div>
        </div>
      </div>
    </div>
  )
}
