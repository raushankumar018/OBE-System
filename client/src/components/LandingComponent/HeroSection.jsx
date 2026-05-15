import React from "react";
import { Button, Avatar, AvatarGroup } from "@mui/material";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";

import aiBoy from "../../assets/Images/ai-boy.png";

// Animation Variants
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const textVariant = {
  hidden: { opacity: 0, x: -50, filter: "blur(10px)" },
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 100 } }
};

const popVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", bounce: 0.5 } }
};

export default function HeroSection() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <section className="relative min-h-screen w-full bg-[#050507] text-white overflow-hidden flex items-center px-6 lg:px-20 pt-15">      
      {/* --- LAYER 1: THE ATMOSPHERE (PARALLAX) --- */}
      <motion.div style={{ y: y1 }} className="absolute inset-0 z-0 pointer-events-none">
        {/* Deep Radiant Glows */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-indigo-900/40 rounded-full blur-[160px]"
        />
        <motion.div 
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-[-20%] right-[0%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[140px]"
        />

        {/* Floating Tech Nodes */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                y: [0, -40, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0.2, 0.5, 0.2] 
              }}
              transition={{ duration: Math.random() * 5 + 5, repeat: Infinity, delay: i }}
              className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee]"
              style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
            />
          ))}
        </div>

        {/* Technical Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '60px 60px' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050507_80%)]" />
      </motion.div>

      {/* --- LAYER 2: CONTENT GRID --- */}
      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* LEFT: Heading & Main Card */}
        <motion.div 
          variants={staggerContainer} initial="hidden" animate="show"
          className="lg:col-span-5 space-y-10"
        >
          <motion.h1 variants={textVariant} className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter">
            <motion.div variants={textVariant}>YOUR</motion.div>
            <motion.div variants={textVariant} className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">FRIENDLY</motion.div>
            <motion.div variants={textVariant}>AI ASSISTANT</motion.div>
          </motion.h1>

          <motion.div variants={textVariant} className="bg-white/5 border border-white/10 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl max-w-lg relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <h4 className="text-cyan-400 font-bold text-xs uppercase tracking-[0.3em] mb-3">Redefining OBE Mapping</h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              Automate your <span className="text-white font-semibold underline decoration-cyan-500/50">CO-PO-PSO mapping</span> and attainment analysis. We turn complex institutional data into a manageable, friendly companion.
            </p>
          </motion.div>

          <motion.div variants={textVariant} className="flex items-center gap-5 pt-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                onClick={() => navigate("/register")}
                variant="contained" 
                className="!bg-gradient-to-r !from-orange-500 !to-pink-600 !rounded-full !px-10 !py-4 !text-lg !font-bold shadow-[0_10px_30px_rgba(236,72,153,0.4)]"
              >
                Get Started
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outlined" 
                className="!border-white/20 !text-white !rounded-full !px-10 !py-4 !text-lg hover:!bg-white/10"
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* CENTER: The Animated Avatar (Parallax + Float) */}
        <motion.div 
          style={{ y: y2 }}
          animate={{ y: [0, -25, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="lg:col-span-4 flex justify-center relative py-12 group"
        >
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="absolute w-96 h-96 bg-cyan-500/30 rounded-full blur-[120px] group-hover:scale-125 transition-transform duration-700" 
          />
          <img 
            src={aiBoy} 
            alt="AI Character" 
            className="w-full max-w-[520px] relative z-10 drop-shadow-[0_30px_60px_rgba(0,0,0,0.9)]" 
          />
        </motion.div>

        {/* RIGHT: Stats & Side Panel */}
        <motion.div 
          variants={staggerContainer} initial="hidden" animate="show"
          className="lg:col-span-3"
        >
          <motion.div variants={popVariant} className="p-8 border border-white/10 bg-white/5 backdrop-blur-lg rounded-3xl space-y-8 shadow-xl hover:bg-white/10 transition-colors duration-500">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
                <div className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">System Active</div>
              </div>
              <h3 className="text-2xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                THE FUTURE OF <br /> EDUCATIONAL ANALYSIS
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Unlock deep-learning insights. Transform data into predictive performance metrics for your institution.
              </p>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-4">
              <AvatarGroup max={4} className="!justify-start">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0 }}><Avatar sx={{ width: 35, height: 35, border: '2px solid #050507 !important' }} src="https://i.pravatar.cc/150?u=1" /></motion.div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}><Avatar sx={{ width: 35, height: 35, border: '2px solid #050507 !important' }} src="https://i.pravatar.cc/150?u=2" /></motion.div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2, delay: 0.4 }}><Avatar sx={{ width: 35, height: 35, border: '2px solid #050507 !important' }} src="https://i.pravatar.cc/150?u=3" /></motion.div>
              </AvatarGroup>
              <div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, type: "spring" }}
                  className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500"
                >
                  56K+
                </motion.div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Users Satisfied</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
}