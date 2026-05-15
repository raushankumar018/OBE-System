import { useState, useEffect } from 'react';
import { attainmentApi } from '../services/api';
import { FileText, FileSpreadsheet, TrendingUp, AlertCircle, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleDownload = async (downloader, label) => {
    try {
      await downloader();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to download ${label}`);
    }
  };

  const load = () => {
    setLoading(true);
    attainmentApi.history()
      .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => { toast.error('Failed to load history'); setHistory([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-full p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-slide-up">
        <div>
          <h1 className="font-display font-bold text-2xl text-paper mb-1">Attainment Reports</h1>
          <p className="text-paper/40 font-body text-sm">All stored CO/PO/PSO attainment records</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 glass px-4 py-2.5 rounded-xl text-paper/50 hover:text-paper text-xs font-body border border-white/[0.06] hover:border-white/20 transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-accent' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="shimmer h-24 rounded-2xl" />)}
        </div>
      ) : history.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center border border-white/[0.06]">
          <div className="w-12 h-12 bg-white/[0.04] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={20} className="text-paper/20" />
          </div>
          <p className="font-display font-bold text-paper/40 text-lg mb-2">No reports yet</p>
          <p className="text-paper/25 font-body text-sm max-w-xs mx-auto">
            Complete the OBE workflow to generate your first attainment report.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, i) => {
            const attained = item.attained_count || 0;
            const total = item.total_cos || 0;
            const pct = total ? Math.round((attained / total) * 100) : 0;
            const color = pct === 100 ? '#D4FF3C' : pct >= 70 ? '#60A5FA' : '#F59E0B';

            return (
              <div
                key={i}
                className="glass rounded-2xl p-5 border border-white/[0.06] step-card animate-slide-up"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color + '18' }}>
                    <TrendingUp size={16} style={{ color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-display font-bold text-paper text-base">
                        {item.course_code || '—'}
                      </p>
                      <span className="font-mono text-[10px] text-paper/30">·</span>
                      <p className="font-body text-paper/40 text-sm">
                        {item.academic_year || '—'}
                      </p>
                    </div>
                    <p className="font-body text-paper/30 text-xs mb-3">
                      {item.num_students || '—'} students · Session {(item.session_id || '').slice(0, 8)}
                    </p>

                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="font-mono text-xs font-bold" style={{ color }}>
                        {attained}/{total} COs
                      </span>
                    </div>
                  </div>

                  {/* Downloads */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownload(
                        () => attainmentApi.downloadPdf(item.course_code, item.academic_year),
                        'PDF report'
                      )}
                      className="flex items-center gap-2 glass px-3 py-2 rounded-lg text-paper/40 hover:text-danger hover:border-danger/30 border border-white/[0.06] text-xs font-body transition-all"
                    >
                      <FileText size={12} /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(
                        () => attainmentApi.downloadExcel(item.course_code, item.academic_year),
                        'Excel report'
                      )}
                      className="flex items-center gap-2 glass px-3 py-2 rounded-lg text-paper/40 hover:text-success hover:border-success/30 border border-white/[0.06] text-xs font-body transition-all"
                    >
                      <FileSpreadsheet size={12} /> Excel
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 glass rounded-xl p-4 border border-white/[0.06] flex items-center gap-3 animate-fade-in">
          <Download size={14} className="text-accent/60" />
          <p className="font-body text-xs text-paper/35">
            All reports are regenerated on-demand from MongoDB. Download any time from the links above.
          </p>
        </div>
      )}
    </div>
  );
}
