import React from "react";
import { Box, Typography, Container } from "@mui/material";
import { motion } from "framer-motion";
import { Settings as SettingsSuggestIcon, AlertCircle as ErrorOutlineIcon, Timer as TimerIcon } from 'lucide-react';

const problems = [
  {
    title: "Manual Work",
    description: "Faculty spend hours preparing CO-PO mapping manually using outdated methods.",
    icon: <SettingsSuggestIcon className="text-orange-500 !text-4xl" />,
    gradient: "from-orange-500/20 to-transparent",
  },
  {
    title: "Calculation Errors",
    description: "Spreadsheet errors and formula mismatches significantly affect attainment accuracy.",
    icon: <ErrorOutlineIcon className="text-cyan-400 !text-4xl" />,
    gradient: "from-cyan-500/20 to-transparent",
  },
  {
    title: "Time Consuming",
    description: "Preparing complex reports for accreditation takes weeks of valuable academic time.",
    icon: <TimerIcon className="text-indigo-400 !text-4xl" />,
    gradient: "from-indigo-500/20 to-transparent",
  },
];

export default function ProblemSection() {
  return (
    <section className="relative py-24 bg-[#050507] overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      <Container maxWidth="lg" className="relative z-10">
        <Box className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography className="text-cyan-400 font-mono tracking-[0.3em] uppercase text-sm mb-4">
              The Challenges
            </Typography>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              What Problem Are <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                We Solving?
              </span>
            </h2>
          </motion.div>
        </Box>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.2, type: "spring", stiffness: 100, damping: 15 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative group"
            >
              {/* Card Container */}
              <div className="relative h-full p-8 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-xl overflow-hidden transition-all duration-300 group-hover:border-white/20 group-hover:bg-white/[0.07]">
                
                {/* Decorative Gradient Flare */}
                <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${problem.gradient} opacity-50`} />

                <div className="relative z-10">
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, delay: index * 0.4 }}
                  >
                    <Box className="mb-6 inline-flex p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner group-hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)] transition-all">
                      {problem.icon}
                    </Box>
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">
                    {problem.title}
                  </h3>
                  
                  <p className="text-gray-400 leading-relaxed text-sm">
                    {problem.description}
                  </p>
                </div>

                {/* Bottom interactive line */}
                <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent transition-all duration-500 group-hover:w-full" />
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}