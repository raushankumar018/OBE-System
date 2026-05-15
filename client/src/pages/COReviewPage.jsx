import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { coApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  ChevronRight, RefreshCw, CheckCircle2, MessageSquare,
  GitBranch, Loader2, AlertTriangle, Zap, BookOpen
} from 'lucide-react';

const BloomBadge = ({ level }) => {
  const colors = {
    'Remember': 'bg-blue-500/15 text-blue-400',
    'Understand': 'bg-purple-500/15 text-purple-400',
    'Apply': 'bg-accent/15 text-accent',
    'Analyse': 'bg-orange-500/15 text-orange-400',
    'Analyze': 'bg-orange-500/15 text-orange-400',
    'Evaluate': 'bg-red-500/15 text-red-400',
    'Create': 'bg-green-500/15 text-green-400',
  };
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${colors[level] || 'bg-white/10 text-paper/50'}`}>
      {level}
    </span>
  );
};

const COCard = ({ co, index }) => (
  <div className="glass rounded-xl p-5 border border-white/[0.06] step-card animate-slide-up"
    style={{ animationDelay: `${index * 0.06}s` }}>
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-accent font-bold">{co.co_id}</span>
        <span className="text-paper/20 text-xs">·</span>
        <span className="font-body text-xs text-paper/35">Unit {co.unit_no}</span>
      </div>
      <BloomBadge level={co.bloom_level} />
    </div>
    <p className="font-body text-paper text-sm leading-relaxed mb-4">{co.co_text}</p>
    <div className="flex flex-wrap gap-1.5">
      {co.po_mapping?.map(po => (
        <span key={po} className="font-mono text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400/80 rounded-full">{po}</span>
      ))}
      {co.pso_mapping?.map(pso => (
        <span key={pso} className="font-mono text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400/80 rounded-full">{pso}</span>
      ))}
    </div>
  </div>
);

const StatusBanner = ({ status, iteration }) => {
  const map = {
    generated: { color: 'accent', label: 'Generated', icon: Zap },
    revised: { color: 'blue-400', label: `Revised (Iteration ${iteration})`, icon: RefreshCw },
    confirmed: { color: 'success', label: 'Confirmed', icon: CheckCircle2 },
    user_provided: { color: 'orange-400', label: 'User Provided', icon: BookOpen },
    awaiting_user_cos: { color: 'warning', label: 'Needs Your Input', icon: AlertTriangle },
  };
  const s = map[status] || map.generated;
  const Icon = s.icon;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]`}>
      <Icon size={13} className={`text-${s.color}`} />
      <span className={`font-mono text-xs text-${s.color}`}>{s.label}</span>
    </div>
  );
};

export default function COReviewPage() {
  const { sessionId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState(state?.data || null);
  const [loading, setLoading] = useState(!state?.data);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!data) {
      coApi.getSession(sessionId)
        .then(r => setData(r.data))
        .catch(() => toast.error('Failed to load session'))
        .finally(() => setLoading(false));
    }
  }, [sessionId]);

  const handleSatisfied = async () => {
    setActionLoading(true);
    try {
      const res = await coApi.feedback({ session_id: sessionId, satisfied: true });
      setData(res.data);
      toast.success('COs confirmed! Proceeding to mapping…');
      setTimeout(() => navigate(`/mapping/${sessionId}`), 1200);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error confirming COs');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeedback = async () => {
    if (!feedback.trim()) { toast.error('Please enter your feedback'); return; }
    setActionLoading(true);
    try {
      const res = await coApi.feedback({ session_id: sessionId, satisfied: false, feedback });
      setData(res.data);
      setFeedback('');
      setShowFeedback(false);
      toast.success(`COs revised (iteration ${res.data.iteration})`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error revising COs');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await coApi.confirm(sessionId);
      setData(res.data);
      toast.success('COs confirmed!');
      setTimeout(() => navigate(`/mapping/${sessionId}`), 800);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error confirming');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={24} className="text-accent animate-spin" />
        <p className="text-paper/30 font-body text-sm">Loading session…</p>
      </div>
    </div>
  );

  const isConfirmed = data?.status === 'confirmed';
  const needsUserCOs = data?.status === 'awaiting_user_cos';

  return (
    <div className="min-h-full p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-paper/30 text-xs font-mono mb-6 animate-fade-in">
        <span>Dashboard</span><ChevronRight size={12} />
        <span>New Course</span><ChevronRight size={12} />
        <span className="text-accent">Review COs</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 animate-slide-up">
        <div>
          <h1 className="font-display font-bold text-2xl text-paper mb-1">
            Review Course Outcomes
          </h1>
          <p className="text-paper/40 font-body text-sm">
            {data?.course_code} · Session {sessionId?.slice(0, 8)}
          </p>
        </div>
        <StatusBanner status={data?.status} iteration={data?.iteration} />
      </div>

      {/* COs */}
      <div className="space-y-3 mb-6">
        {data?.cos?.map((co, i) => <COCard key={co.co_id} co={co} index={i} />)}
      </div>

      {/* Session message */}
      {data?.message && (
        <div className="glass rounded-xl p-4 border border-white/[0.06] mb-6 animate-fade-in">
          <p className="font-mono text-xs text-paper/30 whitespace-pre-line leading-relaxed">{data.message}</p>
        </div>
      )}

      {/* Actions */}
      {!isConfirmed && (
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {needsUserCOs ? (
            <div className="glass rounded-2xl p-5 border border-warning/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-warning" />
                <p className="font-display font-bold text-warning text-sm">AI limit reached</p>
              </div>
              <p className="font-body text-paper/40 text-xs mb-4 leading-relaxed">
                After 3 refinement attempts, please confirm the current COs or provide your own.
              </p>
              <button onClick={handleConfirm} disabled={actionLoading}
                className="accent-btn w-full rounded-xl py-3 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Confirm These COs & Proceed
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleSatisfied}
                disabled={actionLoading}
                className="accent-btn w-full rounded-xl py-4 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span className="font-display font-bold">I'm Satisfied — Proceed to Mapping</span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => setShowFeedback(f => !f)}
                disabled={actionLoading}
                className="w-full glass rounded-xl py-4 flex items-center justify-center gap-3 text-paper/60 hover:text-paper font-body text-sm border border-white/[0.06] hover:border-white/20 transition-all disabled:opacity-50"
              >
                <RefreshCw size={15} className={showFeedback ? 'text-accent' : ''} />
                {showFeedback ? 'Hide feedback form' : 'Refine — Give AI Feedback'}
              </button>

              {showFeedback && (
                <div className="glass rounded-2xl p-5 border border-white/[0.06] space-y-3 animate-slide-up">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={13} className="text-accent" />
                    <p className="font-display font-bold text-paper text-sm">What should change?</p>
                  </div>
                  <p className="text-paper/30 font-body text-xs">
                    Examples: "CO3 should focus on clustering not classification" or "Make CO1 more specific to neural networks"
                  </p>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Describe exactly what you'd like changed in the COs…"
                    rows={4}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-paper font-body text-sm placeholder-paper/20 focus:outline-none focus:border-accent/40 resize-none transition-all"
                  />
                  <button
                    onClick={handleFeedback}
                    disabled={actionLoading || !feedback.trim()}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-xl py-3 text-paper font-display font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} className="text-accent" />}
                    Regenerate with Feedback
                  </button>
                  <p className="text-paper/20 font-mono text-[10px] text-center">
                    Iteration {data?.iteration || 1}/3 · Powered by Groq LLaMA 3.3-70b
                  </p>
                </div>
              )}

              <button
                onClick={() => navigate(`/mapping/${sessionId}`)}
                className="w-full flex items-center justify-center gap-2 text-paper/25 hover:text-paper/50 font-body text-xs py-2 transition-colors"
              >
                <GitBranch size={12} />
                Skip to Mapping
              </button>
            </>
          )}
        </div>
      )}

      {isConfirmed && (
        <div className="animate-slide-up">
          <button
            onClick={() => navigate(`/mapping/${sessionId}`)}
            className="accent-btn w-full rounded-xl py-4 flex items-center justify-center gap-3"
          >
            <GitBranch size={18} />
            <span className="font-display font-bold">Proceed to CO-PO-PSO Mapping</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
