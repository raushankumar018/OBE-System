import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mappingApi } from '../services/api';
import toast from 'react-hot-toast';
import { ChevronRight, Loader2, BarChart3, Info } from 'lucide-react';

const StrengthCell = ({ label }) => {
  if (!label || label === '--') return (
    <td className="text-center py-3 px-2">
      <span className="text-paper/15 font-mono text-[10px]">—</span>
    </td>
  );
  const styles = {
    High: 'bg-accent/20 text-accent border-accent/30',
    Moderate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Low: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  };
  return (
    <td className="text-center py-2 px-1.5">
      <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border ${styles[label] || 'bg-white/5 text-paper/30'}`}>
        {label === 'High' ? '3' : label === 'Moderate' ? '2' : '1'}
      </span>
    </td>
  );
};

const AvgBar = ({ value, max = 3 }) => {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 66 ? '#D4FF3C' : pct >= 33 ? '#60A5FA' : '#F59E0B';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-[10px] text-paper/40 w-6 text-right">{value}</span>
    </div>
  );
};

export default function MappingPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    mappingApi.get(sessionId)
      .then(r => setData(r.data))
      .catch(() => {
        // Not generated yet — auto-generate
        setGenerating(true);
        mappingApi.generate(sessionId)
          .then(r => { setData(r.data); toast.success('Mapping generated!'); })
          .catch(e => toast.error(e.response?.data?.detail || 'Mapping failed'))
          .finally(() => setGenerating(false));
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const regenerate = async () => {
    setGenerating(true);
    try {
      const r = await mappingApi.generate(sessionId);
      setData(r.data);
      toast.success('Mapping regenerated!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate mapping');
    } finally {
      setGenerating(false);
    }
  };

  if (loading || generating) return (
    <div className="min-h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-accent/20 rounded-2xl flex items-center justify-center">
            <BarChart3 size={24} className="text-accent" />
          </div>
          <div className="absolute -inset-2 border border-accent/10 rounded-3xl animate-ping" />
        </div>
        <div>
          <p className="font-display font-bold text-paper text-lg">
            {generating ? 'Generating CO-PO-PSO Mapping…' : 'Loading mapping…'}
          </p>
          <p className="text-paper/30 font-body text-sm mt-1">
            {generating ? 'Semantic similarity + LLM analysis in progress' : 'Please wait'}
          </p>
        </div>
        <Loader2 size={20} className="text-accent animate-spin" />
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-full flex items-center justify-center">
      <div className="text-center">
        <p className="text-paper/40 font-body mb-4">No mapping found.</p>
        <button onClick={regenerate} className="accent-btn px-6 py-3 rounded-xl text-sm font-display font-bold">
          Generate Mapping
        </button>
      </div>
    </div>
  );

  const allPOs = Object.keys(data.po_dict || {});
  const allPSOs = Object.keys(data.pso_dict || {});
  const allCols = [...allPOs, ...allPSOs];
  const cos = data.cos || [];

  return (
    <div className="min-h-full p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-paper/30 text-xs font-mono mb-6 animate-fade-in">
        <span>Dashboard</span><ChevronRight size={12} />
        <span>CO-PO-PSO Mapping</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-slide-up">
        <div>
          <h1 className="font-display font-bold text-2xl text-paper mb-1">CO-PO-PSO Mapping</h1>
          <p className="text-paper/40 font-body text-sm">{data.course_code} · Hybrid Semantic + LLM</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={regenerate} disabled={generating}
            className="flex items-center gap-2 glass px-4 py-2 rounded-xl text-paper/50 hover:text-paper text-xs font-body border border-white/[0.06] hover:border-white/20 transition-all disabled:opacity-40">
            <Loader2 size={13} className={generating ? 'animate-spin text-accent' : ''} />
            Regenerate
          </button>
          <button
            onClick={() => navigate(`/attainment/${sessionId}`)}
            className="accent-btn px-5 py-2 rounded-xl text-sm flex items-center gap-2"
          >
            Next: Attainment <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 animate-fade-in">
        <div className="flex items-center gap-1.5">
          <Info size={11} className="text-paper/25" />
          <span className="font-mono text-[10px] text-paper/30">Legend:</span>
        </div>
        {[
          { label: '3 = High', c: 'bg-accent/20 text-accent border-accent/30' },
          { label: '2 = Moderate', c: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
          { label: '1 = Low', c: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
        ].map(({ label, c }) => (
          <span key={label} className={`font-mono text-[10px] px-2 py-0.5 rounded-md border ${c}`}>{label}</span>
        ))}
      </div>

      {/* Matrix table */}
      <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 font-mono text-[10px] text-paper/30 uppercase tracking-wider w-32">CO</th>
                {allPOs.map(po => (
                  <th key={po} className="text-center px-2 py-3 font-mono text-[10px] text-blue-400/70 uppercase">{po}</th>
                ))}
                <th className="px-2 py-3 w-px">
                  <div className="w-px h-6 bg-white/[0.06] mx-auto" />
                </th>
                {allPSOs.map(pso => (
                  <th key={pso} className="text-center px-2 py-3 font-mono text-[10px] text-purple-400/70 uppercase">{pso}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cos.map((co, i) => (
                <tr key={co.co_id}
                  className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="px-5 py-3">
                    <div>
                      <span className="font-mono text-xs text-accent font-bold">{co.co_id}</span>
                      <p className="font-body text-paper/40 text-[10px] mt-0.5 leading-tight line-clamp-2 max-w-[180px]">
                        {co.co_text?.slice(0, 60)}…
                      </p>
                    </div>
                  </td>
                  {allPOs.map(po => (
                    <StrengthCell key={po} label={data.matrix_label?.[co.co_id]?.[po]} />
                  ))}
                  <td className="px-0"><div className="w-px h-10 bg-white/[0.06] mx-auto" /></td>
                  {allPSOs.map(pso => (
                    <StrengthCell key={pso} label={data.matrix_label?.[co.co_id]?.[pso]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Average PO Strength */}
      {data.average_po_strength && (
        <div className="glass rounded-2xl p-6 border border-white/[0.06] animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <p className="font-display font-bold text-paper text-sm mb-4">Average PO Strength</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {Object.entries(data.average_po_strength)
              .filter(([, v]) => v > 0)
              .map(([po, val]) => (
                <div key={po} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-paper/40 w-8">{po}</span>
                  <div className="flex-1">
                    <AvgBar value={val} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* CO details */}
      <div className="mt-5 space-y-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <p className="font-display font-bold text-paper text-sm mb-3">Course Outcomes Detail</p>
        {cos.map((co) => (
          <div key={co.co_id} className="glass rounded-xl px-4 py-3 border border-white/[0.04] flex gap-4 items-start">
            <span className="font-mono text-xs text-accent font-bold mt-0.5 w-8 flex-shrink-0">{co.co_id}</span>
            <p className="font-body text-paper/70 text-xs leading-relaxed flex-1">{co.co_text}</p>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${
              co.bloom_level === 'Apply' ? 'bg-accent/15 text-accent' :
              co.bloom_level === 'Analyse' || co.bloom_level === 'Analyze' ? 'bg-orange-500/15 text-orange-400' :
              co.bloom_level === 'Create' ? 'bg-green-500/15 text-green-400' :
              'bg-blue-500/15 text-blue-400'
            }`}>{co.bloom_level}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.25s' }}>
        <button
          onClick={() => navigate(`/attainment/${sessionId}`)}
          className="accent-btn w-full rounded-2xl py-4 flex items-center justify-center gap-3"
        >
          <BarChart3 size={18} />
          <span className="font-display font-bold">Proceed to Attainment Calculation</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
