import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Zap, ArrowRight, Shield, Brain, BarChart3, Mail, Lock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const features = [
  { icon: Brain, label: 'AI CO Generation', desc: 'LLaMA 3.3-70B generates course outcomes from your syllabus' },
  { icon: BarChart3, label: 'CO-PO-PSO Mapping', desc: 'Semantic + LLM hybrid mapping with High/Moderate/Low strength' },
  { icon: Shield, label: 'NBA Compliant Reports', desc: 'Auto-generated PDF & Excel reports ready for accreditation' },
];

const MaterialInput = ({ icon: Icon, type = "text", name, value, onChange, label, required, minLength }) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;
  
  return (
    <div className="relative overflow-hidden rounded-t-xl group">
      {/* Background fill */}
      <div className="absolute inset-0 bg-white/[0.03] group-hover:bg-white/[0.06] transition-colors duration-300" />
      
      {/* Active bottom border indicator (Material style) */}
      <motion.div 
        initial={false}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent origin-center z-20"
      />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/[0.1] z-10" />

      {/* Icon */}
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 z-10 ${isActive ? 'text-accent' : 'text-paper/40'}`}>
        <Icon size={18} />
      </div>
      
      {/* Floating Label */}
      <motion.label
        initial={false}
        animate={{
          top: isActive ? '8px' : '50%',
          y: isActive ? 0 : '-50%',
          fontSize: isActive ? '10px' : '14px',
          color: focused ? '#D4FF3C' : 'rgba(255, 255, 255, 0.4)'
        }}
        className="absolute left-12 pointer-events-none origin-left font-body uppercase tracking-wider z-10 font-semibold"
      >
        {label}
      </motion.label>
      
      {/* Input Field */}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        minLength={minLength}
        className="w-full relative z-20 bg-transparent pl-12 pr-4 pt-6 pb-2 text-paper outline-none font-body text-sm"
      />
    </div>
  );
};

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleChange = (event) => {
    setForm(prev => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === 'register') {
        await register(form);
        toast.success('Account created successfully');
      } else {
        await login(form);
        toast.success('Signed in successfully');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Switch modes smoothly
  const toggleMode = (newMode) => {
    if (mode !== newMode) {
      setMode(newMode);
      setForm({ name: '', email: '', password: '' }); // Reset fields
    }
  };

  return (
    <div className="min-h-screen bg-ink flex overflow-hidden relative">
      
      {/* Animated Full-Screen Material / Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[#0A0D14]" /> {/* Deep base color */}
        
        {/* Floating gradient blob 1 */}
        <motion.div
          animate={{
            x: ['0%', '15%', '-5%', '0%'],
            y: ['0%', '-10%', '15%', '0%'],
            scale: [1, 1.1, 0.95, 1],
            rotate: [0, 90, 180, 360],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #D4FF3C, transparent 60%)' }}
        />
        
        {/* Floating gradient blob 2 */}
        <motion.div
          animate={{
            x: ['0%', '-20%', '10%', '0%'],
            y: ['0%', '20%', '-10%', '0%'],
            scale: [1, 1.2, 0.9, 1],
            rotate: [360, 180, 90, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen opacity-[0.15] blur-[120px]"
          style={{ background: 'radial-gradient(circle, #60A5FA, transparent 60%)' }}
        />
        
        {/* Floating gradient blob 3 */}
        <motion.div
          animate={{
            x: ['0%', '10%', '-20%', '0%'],
            y: ['0%', '-20%', '10%', '0%'],
            scale: [0.8, 1, 1.1, 0.8],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] left-[20%] w-[45vw] h-[45vw] rounded-full mix-blend-screen opacity-[0.12] blur-[90px]"
          style={{ background: 'radial-gradient(circle, #9B59B6, transparent 60%)' }}
        />
        
        {/* Subtle Material Grid Overlay */}
        <motion.div 
          animate={{ opacity: [0.02, 0.04, 0.02] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0" 
          style={{ 
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} 
        />
      </div>

      <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay pointer-events-none z-0" />

      {/* Left — branding */}
      <div className="hidden lg:flex flex-col w-1/2 p-16 relative justify-between z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Zap size={20} className="text-ink" />
            </div>
            <div>
              <span className="font-display font-bold text-paper text-lg tracking-wide">OBE System</span>
              <span className="text-paper/40 text-xs ml-2 font-mono uppercase tracking-widest">by Vignan's</span>
            </div>
          </div>

          <h1 className="font-display font-bold text-[3.5rem] leading-[1.1] mb-6">
            <motion.span className="block text-paper" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>Outcome-Based</motion.span>
            <motion.span className="block text-paper" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>Education</motion.span>
            <motion.span 
              className="block tracking-tight text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(212,255,60,0.5)]"
              style={{ backgroundImage: 'linear-gradient(to right, #D4FF3C, #60A5FA, #D4FF3C)', backgroundSize: '200% auto' }}
              animate={{ backgroundPosition: ['0% center', '200% center'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              initial={{ opacity: 0, x: -20 }} 
              whileInView={{ opacity: 1, x: 0 }} 
            >
              Automated.
            </motion.span>
          </h1>
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}
            className="text-paper/45 font-body text-lg leading-relaxed max-w-md"
          >
            AI-powered CO generation, CO-PO-PSO mapping, and attainment calculation in one seamless workflow.
          </motion.p>
        </motion.div>

        {/* Features */}
        <div className="space-y-4">
          <AnimatePresence>
            {features.map(({ icon: Icon, label, desc }, i) => (
              <motion.div 
                key={label} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + (i * 0.1), type: 'spring', stiffness: 100 }}
                whileHover={{ scale: 1.02, x: 10, backgroundColor: 'rgba(255,255,255,0.04)' }}
                className="flex gap-5 p-5 bg-white/[0.015] border border-white/[0.04] backdrop-blur-xl rounded-[20px] transition-colors cursor-default relative overflow-hidden group"
                style={{ boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)' }}
              >
                {/* Subtle sheen passing through card on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-[200%] group-hover:animate-[shimmer_1s_infinite] pointer-events-none" />
                
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/5 rounded-[14px] flex items-center justify-center flex-shrink-0 mt-0.5 border border-accent/20 shadow-[0_0_15px_rgba(212,255,60,0.1)] group-hover:shadow-[0_0_20px_rgba(212,255,60,0.2)] transition-shadow">
                  <Icon size={20} className="text-accent" />
                </div>
                <div>
                  <p className="font-display font-semibold text-paper text-[15px] tracking-wide mb-1">{label}</p>
                  <p className="text-paper/40 font-body text-xs leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right — login card */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 80 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden justify-center">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <Zap size={20} className="text-ink" />
            </div>
            <span className="font-display font-bold text-paper text-xl">OBE System</span>
          </div>

          <motion.div 
            layout
            className="bg-[#0A0D14]/70 backdrop-blur-[40px] border border-white/[0.08] rounded-[32px] p-10 relative overflow-hidden"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(212, 255, 60, 0.03)' }}
          >
            {/* Top inner glow for premium glass feel */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.25] to-transparent" />
            
            <motion.h2 layout="position" className="font-display font-bold text-3xl text-paper mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </motion.h2>
            <motion.p layout="position" className="text-paper/40 font-body text-[13px] mb-8">
              {mode === 'login' ? 'Sign in with your email and password to continue.' : 'Register to start automating your curriculum.'}
            </motion.p>

            {/* Material Tabs */}
            <motion.div layout="position" className="flex relative bg-white/[0.03] p-1 rounded-xl mb-8 border border-white/[0.05]">
              <button
                type="button"
                onClick={() => toggleMode('login')}
                className={`flex-1 relative z-10 rounded-lg py-2.5 text-sm font-display font-semibold transition-colors duration-300 ${mode === 'login' ? 'text-ink' : 'text-paper/50 hover:text-paper'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => toggleMode('register')}
                className={`flex-1 relative z-10 rounded-lg py-2.5 text-sm font-display font-semibold transition-colors duration-300 ${mode === 'register' ? 'text-ink' : 'text-paper/50 hover:text-paper'}`}
              >
                Register
              </button>
              {/* Active Tab Indicator */}
              <motion.div 
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-paper rounded-lg z-0"
                initial={false}
                animate={{ left: mode === 'login' ? '4px' : 'calc(50%)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
              />
            </motion.div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {mode === 'register' && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                  >
                    <MaterialInput 
                      icon={User} 
                      name="name" 
                      value={form.name} 
                      onChange={handleChange} 
                      label="Full Name" 
                      required 
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div layout>
                <MaterialInput 
                  icon={Mail} 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  label="Email Address" 
                  required 
                />
              </motion.div>

              <motion.div layout>
                <MaterialInput 
                  icon={Lock} 
                  type="password" 
                  name="password" 
                  value={form.password} 
                  onChange={handleChange} 
                  label="Password" 
                  required 
                  minLength={mode === 'register' ? 8 : undefined}
                />
              </motion.div>

              <motion.button
                layout
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="w-full relative overflow-hidden flex items-center justify-center gap-3 bg-accent text-[#0A0D14] rounded-2xl px-6 py-4.5 min-h-[56px] font-display font-bold tracking-wide mt-6 disabled:opacity-70 group transition-shadow"
                style={{ boxShadow: '0 10px 25px -5px rgba(212, 255, 60, 0.4), 0 0 0 1px rgba(212, 255, 60, 0.6) inset' }}
              >
                {/* sweeping light beam */}
                <motion.div 
                  className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
                  animate={{ x: ['-300%', '400%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                />
                
                <span className="relative z-10 text-[15px]">{submitting ? 'Authenticating...' : mode === 'register' ? 'Create Account' : 'Sign In'}</span>
                {!submitting && (
                  <motion.div 
                    className="relative z-10" 
                    animate={{ x: [0, 4, 0] }} 
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight size={18} className="text-[#0A0D14]/80 ml-1" />
                  </motion.div>
                )}
              </motion.button>
            </form>

            <motion.p layout="position" className="text-center text-paper/30 text-[11px] font-body leading-relaxed mt-6 flex items-center justify-center gap-2">
              <Shield size={12} className="text-accent/50" />
              Secure authentication via encrypted session tokens.
            </motion.p>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            className="text-center text-paper/20 text-[11px] font-mono mt-8 uppercase tracking-widest"
          >
            AI-Powered Curriculum System · 2026
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
