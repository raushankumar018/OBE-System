import React from "react";
import { Box, Typography, Container } from "@mui/material";
import { motion } from "framer-motion";
import { UploadCloud as CloudUploadIcon, Wand2 as AutoFixHighIcon, HelpCircle as QuizIcon, BarChart4 as AssessmentIcon } from 'lucide-react';

const steps = [
  {
    title: "Upload Syllabus",
    desc: "Simply drop your course syllabus PDF or Doc.",
    icon: <CloudUploadIcon />,
    color: "text-blue-400",
    glow: "bg-blue-500/20"
  },
  {
    title: "Generate CO",
    desc: "AI extracts and aligns Course Outcomes automatically.",
    icon: <AutoFixHighIcon />,
    color: "text-purple-400",
    glow: "bg-purple-500/20"
  },
  {
    title: "Upload Exams",
    desc: "Add question papers and student marks data.",
    icon: <QuizIcon />,
    color: "text-orange-400",
    glow: "bg-orange-500/20"
  },
  {
    title: "Get Reports",
    desc: "Download complete CO-PO attainment analytics.",
    icon: <AssessmentIcon />,
    color: "text-cyan-400",
    glow: "bg-cyan-500/20"
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-24 bg-[#050507] overflow-hidden">
      {/* Subtle Background Glow */}
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" 
      />

      <Container maxWidth="lg" className="relative z-10">
        <Box className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <Typography className="text-orange-500 font-mono tracking-[0.3em] uppercase text-sm mb-4 font-bold">
              The Process
            </Typography>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Simple 4-Step <span className="text-orange-600">Workflow</span>
            </h2>
          </motion.div>
        </Box>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting Animated Line (Desktop Only) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-y-12 overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-1/3 h-full bg-gradient-to-r from-transparent via-orange-500 to-transparent"
            />
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.2, type: "spring", stiffness: 150, damping: 12 }}
              whileHover={{ y: -10 }}
              className="relative group"
            >
              <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 rounded-[2rem] h-full flex flex-col items-center text-center transition-all duration-300 group-hover:bg-white/[0.07] group-hover:border-orange-500/30 group-hover:shadow-[0_20px_40px_rgba(234,88,12,0.1)]">
                
                {/* Step Number Badge */}
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="absolute -top-4 bg-[#050507] border border-white/10 px-4 py-1 rounded-full text-xs font-bold text-gray-500 group-hover:text-orange-500 transition-colors shadow-lg"
                >
                  STEP 0{index + 1}
                </motion.div>

                {/* Icon Circle */}
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: index * 0.3 }}
                  className={`relative w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:rotate-[10deg] ${step.glow} border border-white/5 shadow-xl`}
                >
                   <span className={`${step.color} !text-4xl`}>
                     {React.cloneElement(step.icon, { sx: { fontSize: 40 } })}
                   </span>
                </motion.div>
                
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                  {step.title}
                </h3>
                
                <p className="text-gray-400 text-xs leading-relaxed">
                  {step.desc}
                </p>

                {/* Animated Arrow (Desktop Only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-12 z-20">
                    <motion.span 
                      animate={{ x: [0, 8, 0], scale: [1, 1.2, 1], color: ["#ffffff40", "#ea580c", "#ffffff40"] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-white/20 text-3xl font-light"
                    >
                      →
                    </motion.span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}