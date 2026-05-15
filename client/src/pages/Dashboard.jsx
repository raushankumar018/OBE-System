import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { attainmentApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus, BookOpen, GitBranch, BarChart3, FileText,
  TrendingUp, Clock, ChevronRight, Zap, AlertCircle
} from 'lucide-react';

const StepCard = ({ num, title, desc, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className="step-card glass rounded-2xl p-6 text-left w-full border border-white/[0.06] group"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <span className="font-mono text-[10px] text-paper/20">{String(num).padStart(2, '0')}</span>
    </div>
    <p className="font-display font-bold text-paper text-base mb-1 group-hover:text-accent transition-colors">{title}</p>
    <p className="text-paper/40 font-body text-xs leading-relaxed">{desc}</p>
    <div className="flex items-center gap-1 mt-4 text-paper/25 text-xs font-body group-hover:text-accent/60 transition-colors">
      <span>Start</span>
      <ChevronRight size={12} />
    </div>
  </button>
);

const StatPill = ({ label, value, sub }) => (
  <div className="glass rounded-xl px-4 py-3">
    <p className="font-display font-bold text-2xl text-paper leading-none">{value}</p>
    <p className="font-body text-xs text-paper/40 mt-1">{label}</p>
    {sub && <p className="font-mono text-[10px] text-accent/60 mt-0.5">{sub}</p>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attainmentApi.history()
      .then(r => setHistory(Array.isArray(r.data) ? r.data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Faculty';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const handlePdfDownload = async (course, year) => {
    try {
      await attainmentApi.downloadPdf(course, year);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to download PDF report');
    }
  };

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      <div className="noise-overlay" />

      {/* Header */}
      <div className="mb-10 animate-slide-up">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 bg-accent rounded-full" />
          <span className="font-mono text-[11px] text-paper/30 tracking-widest uppercase">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <h1 className="font-display font-bold text-4xl text-paper leading-tight">
          {greeting},<br />
          <span className="text-accent">{firstName}.</span>
        </h1>
        <p className="text-paper/40 font-body text-sm mt-2">{user?.department} · {user?.university}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <StatPill label="Reports Generated" value={history.length} sub="All time" />
        <StatPill label="Active Sessions" value={user?.sessions?.length || 0} sub="This semester" />
        <StatPill label="AI Engine" value="Live" sub="Groq · LLaMA 3.3" />
      </div>

      {/* Quick start */}
      <div className="mb-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <button
          onClick={() => navigate('/course/new')}
          className="accent-btn w-full rounded-2xl px-6 py-4 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ink/20 rounded-xl flex items-center justify-center">
              <Plus size={16} className="text-ink" />
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-ink text-sm">Start New OBE Workflow</p>
              <p className="font-body text-ink/50 text-xs">Upload syllabus → Generate COs → Map → Attainment</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-ink/40 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Workflow steps */}
      <div className="grid grid-cols-2 gap-3 mb-8 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <StepCard num={1} title="Generate COs" icon={BookOpen} color="#D4FF3C"
          desc="Upload your syllabus PDF and let AI generate Course Outcomes using LLaMA 3.3"
          onClick={() => navigate('/course/new')} />
        <StepCard num={2} title="CO-PO-PSO Mapping" icon={GitBranch} color="#60A5FA"
          desc="Semantic + LLM hybrid mapping with High/Moderate/Low strength ratings"
          onClick={() => navigate('/history')} />
        <StepCard num={3} title="Attainment Calculation" icon={BarChart3} color="#34D399"
          desc="Upload student marks Excel and compute CO/PO/PSO attainment scores"
          onClick={() => navigate('/history')} />
        <StepCard num={4} title="Download Reports" icon={FileText} color="#F59E0B"
          desc="NBA-compliant PDF and Excel reports generated automatically for accreditation"
          onClick={() => navigate('/history')} />
      </div>

      {/* Recent history */}
      <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-display font-bold text-paper text-base">Recent Reports</p>
          <button onClick={() => navigate('/history')}
            className="text-paper/30 hover:text-accent text-xs font-body flex items-center gap-1 transition-colors">
            View all <ChevronRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="shimmer h-16 rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center border border-white/[0.06]">
            <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={18} className="text-paper/20" />
            </div>
            <p className="font-display font-semibold text-paper/50 text-sm mb-1">No reports yet</p>
            <p className="text-paper/25 font-body text-xs">
              Start a new OBE workflow to generate your first attainment report.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((item, i) => (
              <div key={i} className="glass rounded-xl px-5 py-4 flex items-center gap-4 step-card border border-white/[0.06]">
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={14} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-paper text-sm">
                    {item.course_code || item.course_name || 'Unknown Course'}
                  </p>
                  <p className="text-paper/35 font-body text-xs mt-0.5">
                    {item.academic_year} · {item.num_students || '—'} students
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                    item.attained_count >= item.total_cos
                      ? 'bg-success/15 text-success'
                      : 'bg-warning/15 text-warning'
                  }`}>
                    {item.attained_count}/{item.total_cos} COs
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePdfDownload(item.course_code, item.academic_year)}
                    className="text-paper/25 hover:text-accent transition-colors"
                    title="Download PDF"
                  >
                    <FileText size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="mt-8 flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <Zap size={11} className="text-accent/40" />
        <p className="font-mono text-[10px] text-paper/20">
          Python FastAPI · MongoDB Atlas · Groq LLaMA 3.3-70b · MERN Stack
        </p>
      </div>
    </div>
  );
}
