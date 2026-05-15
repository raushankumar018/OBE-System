import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attainmentApi, templateApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  Upload, FileSpreadsheet, Download, ChevronRight,
  Loader2, TrendingUp, CheckCircle2, XCircle, BarChart3, FileText
} from 'lucide-react';

const AttainmentLevel = ({ level }) => {
  const colors = [null, 'text-orange-400', 'text-blue-400', 'text-accent'];
  const labels = [null, 'Level 1', 'Level 2', 'Level 3'];
  return (
    <span className={`font-mono text-[10px] ${colors[level] || 'text-paper/30'}`}>
      {labels[level] || '—'}
    </span>
  );
};

const CORow = ({ row, index }) => {
  const attained = row.attained === 'Attained';
  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors animate-slide-up`}
      style={{ animationDelay: `${index * 0.04}s` }}>
      <span className="font-mono text-xs text-accent font-bold w-8">{row.co_id}</span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-paper/70 text-xs leading-tight truncate">{row.co_text}</p>
        <p className="font-mono text-[10px] text-paper/25 mt-0.5">{row.bloom_level}</p>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="text-right">
          <p className="text-paper/50">{row.ia_pct?.toFixed(1)}%</p>
          <p className="text-[10px] text-paper/20" title="Formative Assessment (FA)">FA</p>
        </div>
        <div className="text-right">
          <p className="text-paper/50">{row.ete_pct?.toFixed(1)}%</p>
          <p className="text-[10px] text-paper/20" title="Summative Assessment (SA)">SA</p>
        </div>
        <div className="text-right">
          <p className={`font-bold ${attained ? 'text-accent' : 'text-orange-400'}`}>
            {row.final_score?.toFixed(2)}
          </p>
          <p className="text-[10px] text-paper/20">Score</p>
        </div>
        <div className="flex items-center gap-1.5 w-24">
          {attained
            ? <CheckCircle2 size={13} className="text-success flex-shrink-0" />
            : <XCircle size={13} className="text-danger/60 flex-shrink-0" />}
          <span className={`text-[10px] ${attained ? 'text-success' : 'text-danger/60'}`}>
            {row.attained}
          </span>
        </div>
        <AttainmentLevel level={row.class_level} />
      </div>
    </div>
  );
};

const PORow = ({ row, type }) => {
  const pct = row.attainment_pct;
  const color = pct >= 70 ? '#D4FF3C' : pct >= 50 ? '#60A5FA' : '#F59E0B';
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <span className="font-mono text-[10px] font-bold w-10" style={{ color }}>
        {row.outcome}
      </span>
      <div className="flex-1">
        <p className="font-body text-paper/50 text-[11px] leading-tight truncate">{row.description}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24">
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: color }} />
          </div>
          <p className="font-mono text-[9px] text-paper/30 mt-0.5 text-right">{pct?.toFixed(1)}%</p>
        </div>
        <span className="font-mono text-xs text-paper/40">{row.score?.toFixed(2)}</span>
        <span className="font-mono text-[10px] text-paper/25 w-12">{row.contributors}</span>
      </div>
    </div>
  );
};

const getErrorMessage = (err) => {
  const data = err.response?.data;
  const detail = data?.detail || data?.error;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        const field = Array.isArray(item.loc) ? item.loc.join('.') : item.loc;
        return `${field ? `${field}: ` : ''}${item.msg || JSON.stringify(item)}`;
      })
      .join('\n');
  }
  if (detail) return JSON.stringify(detail);

  return err.message || 'Calculation failed';
};

export default function AttainmentPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const marksRef = useRef();
  const questionPaperRef = useRef();

  const [marksFile, setMarksFile] = useState(null);
  const [questionPaper, setQuestionPaper] = useState(null);
  const [indirectScore, setIndirectScore] = useState(3.0);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('co');

  const handleDownload = async (downloader, label) => {
    try {
      await downloader();
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to download ${label}`);
    }
  };

  const handleCalculate = async () => {
    if (!questionPaper || !marksFile) {
      toast.error('Upload both question paper and filled marks file');
      return;
    }

    setCalculating(true);
    try {
      const fd = new FormData();
      fd.append('session_id', sessionId);
      fd.append('indirect_score', String(indirectScore));
      fd.append('marks_file', marksFile);
      fd.append('question_paper', questionPaper);

      const res = await attainmentApi.calculate(fd);
      setResult(res.data);
      toast.success(`Attainment calculated! ${res.data.attained_count}/${res.data.total_cos} COs attained`);
    } catch (err) {
      toast.error(getErrorMessage(err), { duration: 6000 });
    } finally {
      setCalculating(false);
    }
  };

  const tabs = ['co', 'po', 'pso'];
  const tabLabels = { co: 'CO Attainment', po: 'PO Attainment', pso: 'PSO Attainment' };

  return (
    <div className="min-h-full p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-paper/30 text-xs font-mono mb-6 animate-fade-in">
        <span>Dashboard</span><ChevronRight size={12} />
        <span>Attainment</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-slide-up">
        <div>
          <h1 className="font-display font-bold text-2xl text-paper mb-1">Attainment Calculation</h1>
          <p className="text-paper/40 font-body text-sm">Session {sessionId?.slice(0, 8)} · Upload marks to compute CO/PO/PSO attainment</p>
        </div>
        {sessionId && (
          <button
            type="button"
            onClick={() => handleDownload(() => templateApi.downloadMarks(sessionId), 'marks template')}
            className="flex items-center gap-2 glass px-4 py-2.5 rounded-xl text-paper/50 hover:text-accent text-xs font-body border border-white/[0.06] hover:border-accent/30 transition-all"
          >
            <Download size={13} /> Download Marks Template
          </button>
        )}
      </div>

      {/* Upload panel */}
      {!result && (
        <div className="glass rounded-2xl p-6 border border-white/[0.06] mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <p className="font-display font-bold text-paper text-sm mb-5 flex items-center gap-2">
            <Upload size={14} className="text-accent" /> Upload Question Paper and Student Marks
          </p>

          {/* Question paper drop */}
          <div
            onClick={() => questionPaperRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-5 ${
              questionPaper ? 'border-accent/40 bg-accent/5' : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <input ref={questionPaperRef} type="file" accept=".pdf,.doc,.docx,.txt"
              onChange={e => setQuestionPaper(e.target.files[0])} className="hidden" />
            {questionPaper ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={18} className="text-accent" />
                <div className="text-left">
                  <p className="font-body text-paper text-sm font-medium">{questionPaper.name}</p>
                  <p className="text-paper/40 text-xs">{(questionPaper.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <FileText size={20} className="text-paper/25 mx-auto mb-2" />
                <p className="font-body text-paper/50 text-sm mb-1">Upload question paper</p>
                <p className="font-mono text-paper/25 text-xs">PDF · DOCX · TXT</p>
                <p className="text-paper/20 text-xs font-body mt-2">
                  Used to map question components to course outcomes.
                </p>
              </>
            )}
          </div>

          {/* Marks file drop */}
          <div
            onClick={() => marksRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-5 ${
              marksFile ? 'border-accent/40 bg-accent/5' : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <input ref={marksRef} type="file" accept=".xlsx,.xls"
              onChange={e => setMarksFile(e.target.files[0])} className="hidden" />
            {marksFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet size={18} className="text-accent" />
                <div className="text-left">
                  <p className="font-body text-paper text-sm font-medium">{marksFile.name}</p>
                  <p className="text-paper/40 text-xs">{(marksFile.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <FileSpreadsheet size={20} className="text-paper/25 mx-auto mb-2" />
                <p className="font-body text-paper/50 text-sm mb-1">Upload filled marks Excel</p>
                <p className="font-mono text-paper/25 text-xs">XLSX · XLS</p>
                <p className="text-paper/20 text-xs font-body mt-2">
                  Use the downloaded template Question_IDs. Blank marks are ignored.
                </p>
              </>
            )}
          </div>

          {/* Indirect score */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <label className="block font-body text-xs text-paper/50 mb-1.5">
                Course Exit Survey Score (Indirect Attainment)
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="5" step="0.1" value={indirectScore}
                  onChange={e => setIndirectScore(parseFloat(e.target.value))}
                  className="flex-1 accent-[#D4FF3C]" />
                <span className="font-mono text-accent font-bold text-sm w-10 text-center">{indirectScore.toFixed(1)}</span>
                <span className="text-paper/30 font-mono text-xs">/ 5.0</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={calculating || !marksFile || !questionPaper}
            className="accent-btn w-full rounded-xl py-4 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {calculating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span className="font-display font-bold">Computing attainment…</span>
              </>
            ) : (
              <>
                <BarChart3 size={18} />
                <span className="font-display font-bold">Calculate CO/PO/PSO Attainment</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="animate-fade-in">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'COs Attained', val: `${result.attained_count}/${result.total_cos}`, color: 'text-accent' },
              { label: 'Total Students', val: result.num_students, color: 'text-paper' },
              { label: 'Academic Year', val: result.academic_year, color: 'text-paper' },
              { label: 'Saved to DB', val: result.saved_to_db ? 'Yes' : 'No', color: result.saved_to_db ? 'text-success' : 'text-warning' },
            ].map(({ label, val, color }) => (
              <div key={label} className="glass rounded-xl px-4 py-3 border border-white/[0.06]">
                <p className={`font-display font-bold text-xl ${color}`}>{val}</p>
                <p className="font-body text-xs text-paper/35 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Download buttons */}
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleDownload(
                () => attainmentApi.downloadPdf(result.course_code, result.academic_year),
                'PDF report'
              )}
              className="flex-1 flex items-center justify-center gap-2 glass rounded-xl py-3 text-paper/60 hover:text-accent border border-white/[0.06] hover:border-accent/30 text-sm font-body transition-all"
            >
              <FileText size={15} /> Download PDF Report
            </button>
            <button
              type="button"
              onClick={() => handleDownload(
                () => attainmentApi.downloadExcel(result.course_code, result.academic_year),
                'Excel report'
              )}
              className="flex-1 flex items-center justify-center gap-2 glass rounded-xl py-3 text-paper/60 hover:text-success border border-white/[0.06] hover:border-success/30 text-sm font-body transition-all"
            >
              <FileSpreadsheet size={15} /> Download Excel Report
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 glass rounded-xl border border-white/[0.06] w-fit mb-5">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-xs font-display font-bold transition-all ${
                  activeTab === tab ? 'bg-accent text-ink' : 'text-paper/40 hover:text-paper'
                }`}>
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          {/* Tables */}
          <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
            {activeTab === 'co' && (
              <>
                {/* Table header */}
                <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                  <span className="font-mono text-[10px] text-paper/25 uppercase w-8">CO</span>
                  <span className="font-mono text-[10px] text-paper/25 uppercase flex-1">Description</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-12 text-right" title="Formative Assessment (FA)">FA%</span>
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-12 text-right" title="Summative Assessment (SA)">SA%</span>
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-14 text-right">Score</span>
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-24">Status</span>
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-12">Level</span>
                  </div>
                </div>
                {result.co_attainment?.map((row, i) => <CORow key={row.co_id} row={row} index={i} />)}
              </>
            )}
            {activeTab === 'po' && (
              <>
                <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                  <span className="font-mono text-[10px] text-paper/25 uppercase w-10">PO</span>
                  <span className="font-mono text-[10px] text-paper/25 uppercase flex-1">Description</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-24">Attainment</span>
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-10">Score</span>
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-12">Via</span>
                  </div>
                </div>
                {result.po_attainment?.map((row, i) => <PORow key={row.outcome} row={row} type="po" />)}
              </>
            )}
            {activeTab === 'pso' && (
              <>
                <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                  <span className="font-mono text-[10px] text-paper/25 uppercase w-10">PSO</span>
                  <span className="font-mono text-[10px] text-paper/25 uppercase flex-1">Description</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-24">Attainment</span>
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-10">Score</span>
                    <span className="font-mono text-[10px] text-paper/25 uppercase w-12">Via</span>
                  </div>
                </div>
                {result.pso_attainment?.map((row, i) => <PORow key={row.outcome} row={row} type="pso" />)}
              </>
            )}
          </div>

          {/* Recalculate */}
          <button
            onClick={() => setResult(null)}
            className="mt-5 w-full flex items-center justify-center gap-2 text-paper/25 hover:text-paper/50 font-body text-xs py-2 transition-colors"
          >
            <TrendingUp size={12} /> Recalculate with different marks
          </button>
        </div>
      )}
    </div>
  );
}
