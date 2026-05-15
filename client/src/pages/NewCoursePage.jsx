import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { coApi } from '../services/api';
import toast from 'react-hot-toast';
import {
  Upload, FileText, X, ChevronRight, Loader2,
  BookOpen, Settings2, AlertCircle
} from 'lucide-react';

const Field = ({ label, name, type = 'text', value, onChange, placeholder, min, max }) => (
  <div>
    <label className="block font-body text-xs text-paper/50 mb-1.5">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-paper font-body text-sm placeholder-paper/20 focus:outline-none focus:border-accent/40 focus:bg-white/[0.06] transition-all"
    />
  </div>
);

const Select = ({ label, name, value, onChange, options }) => (
  <div>
    <label className="block font-body text-xs text-paper/50 mb-1.5">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-paper font-body text-sm focus:outline-none focus:border-accent/40 transition-all appearance-none cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {options.map(o => <option key={o} value={o} style={{ background: '#1A1A2E' }}>{o}</option>)}
    </select>
  </div>
);

export default function NewCoursePage() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    course_code: '',
    course_name: '',
    university: "Vignan's University",
    department: 'Computer Science and Engineering',
    degree: 'B.Tech',
    academic_year: '2025-26',
    semester: 'III',
    coordinator: '',
    num_students: 60,
    num_cos_target: 4,
    num_modules: 2,
  });

  const handleChange = e => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleFileDrop = e => {
    e.preventDefault();
    const f = e.dataTransfer?.files[0] || e.target.files[0];
    if (f) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!['pdf','docx','txt'].includes(ext)) {
        toast.error('Only PDF, DOCX, or TXT files allowed');
        return;
      }
      setFile(f);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file && !form.syllabus_text) {
      toast.error('Please upload a syllabus file');
      return;
    }
    if (!form.course_code || !form.course_name) {
      toast.error('Course code and name are required');
      return;
    }

    setLoading(true);
    const fd = new FormData();
    if (file) fd.append('file', file);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));

    try {
      const res = await coApi.generate(fd);
      toast.success('COs generated successfully!');
      navigate(`/co/${res.data.session_id}/review`, { state: { data: res.data } });
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-center gap-2 text-paper/30 text-xs font-mono mb-4">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <span className="text-accent">New Course</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <BookOpen size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-paper">Generate Course Outcomes</h1>
            <p className="text-paper/35 font-body text-sm">Upload your syllabus and configure course details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        {/* Syllabus upload */}
        <div className="glass rounded-2xl p-6 border border-white/[0.06]">
          <p className="font-display font-bold text-paper text-sm mb-4 flex items-center gap-2">
            <Upload size={14} className="text-accent" /> Syllabus Document
          </p>
          <div
            onDrop={handleFileDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => !file && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              file
                ? 'border-accent/40 bg-accent/5'
                : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileDrop} className="hidden" />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={20} className="text-accent" />
                <div className="text-left">
                  <p className="font-body text-paper text-sm font-medium">{file.name}</p>
                  <p className="text-paper/40 text-xs">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="ml-4 w-6 h-6 bg-white/[0.08] rounded-full flex items-center justify-center hover:bg-danger/20 transition-colors"
                >
                  <X size={12} className="text-paper/60" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-white/[0.04] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={18} className="text-paper/30" />
                </div>
                <p className="font-body text-paper/50 text-sm mb-1">Drop your syllabus here or click to browse</p>
                <p className="font-mono text-paper/25 text-xs">PDF · DOCX · TXT · Max 50MB</p>
              </>
            )}
          </div>
        </div>

        {/* Course metadata */}
        <div className="glass rounded-2xl p-6 border border-white/[0.06]">
          <p className="font-display font-bold text-paper text-sm mb-5 flex items-center gap-2">
            <Settings2 size={14} className="text-accent" /> Course Details
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Course Code *" name="course_code" value={form.course_code}
              onChange={handleChange} placeholder="e.g. CSEML301" />
            <Field label="Course Name *" name="course_name" value={form.course_name}
              onChange={handleChange} placeholder="e.g. Machine Learning" />
            <Field label="University" name="university" value={form.university} onChange={handleChange} />
            <Field label="Department" name="department" value={form.department} onChange={handleChange} />
            <Select label="Degree" name="degree" value={form.degree} onChange={handleChange}
              options={['B.Tech', 'M.Tech', 'MBA', 'MCA', 'BCA', 'B.Sc', 'M.Sc']} />
            <Field label="Academic Year" name="academic_year" value={form.academic_year}
              onChange={handleChange} placeholder="2025-26" />
            <Select label="Semester" name="semester" value={form.semester} onChange={handleChange}
              options={['I','II','III','IV','V','VI','VII','VIII']} />
            <Field label="Coordinator Name" name="coordinator" value={form.coordinator}
              onChange={handleChange} placeholder="Dr. Name" />
          </div>
        </div>

        {/* Exam config */}
        <div className="glass rounded-2xl p-6 border border-white/[0.06]">
          <p className="font-display font-bold text-paper text-sm mb-5 flex items-center gap-2">
            <AlertCircle size={14} className="text-accent" /> Generation Config
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-body text-xs text-paper/50 mb-1.5">No. of Students</label>
              <input type="number" name="num_students" value={form.num_students} onChange={handleChange}
                min={1} max={500}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-paper font-body text-sm focus:outline-none focus:border-accent/40 transition-all" />
            </div>
            <div>
              <label className="block font-body text-xs text-paper/50 mb-1.5">Target COs</label>
              <input type="number" name="num_cos_target" value={form.num_cos_target} onChange={handleChange}
                min={2} max={8}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-paper font-body text-sm focus:outline-none focus:border-accent/40 transition-all" />
            </div>
            <div>
              <label className="block font-body text-xs text-paper/50 mb-1.5">No. of Modules</label>
              <input type="number" name="num_modules" value={form.num_modules} onChange={handleChange}
                min={1} max={6}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-paper font-body text-sm focus:outline-none focus:border-accent/40 transition-all" />
            </div>
          </div>
          <div className="mt-4 p-3 bg-accent/5 border border-accent/15 rounded-xl flex gap-2">
            <AlertCircle size={13} className="text-accent/60 flex-shrink-0 mt-0.5" />
            <p className="font-body text-xs text-paper/40 leading-relaxed">
              The AI uses Groq LLaMA 3.3-70b to analyze your syllabus and generate
              Bloom's Taxonomy-aligned COs with PO/PSO mappings. You can refine them in the next step.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="accent-btn w-full rounded-xl py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Analyzing syllabus with AI…</span>
            </>
          ) : (
            <>
              <span>Generate Course Outcomes</span>
              <ChevronRight size={18} />
            </>
          )}
        </button>

        {loading && (
          <p className="text-center text-paper/30 text-xs font-body animate-pulse">
            This may take 15–30 seconds depending on syllabus length
          </p>
        )}
      </form>
    </div>
  );
}
