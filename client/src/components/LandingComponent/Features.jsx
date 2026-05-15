import React from "react";
import { Box, Typography, Container } from "@mui/material";
import { motion } from "framer-motion";
import { Sparkles as AutoAwesomeIcon, Network as AccountTreeIcon, BarChart3 as BarChartIcon } from 'lucide-react';

const featureList = [
  {
    title: "AI CO Generator",
    desc: "Leverage advanced NLP to instantly generate Bloom's Taxonomy-aligned Course Outcomes from your syllabus.",
    icon: <AutoAwesomeIcon className="text-orange-500" />,
    border: "group-hover:border-orange-500/50",
    shadow: "group-hover:shadow-orange-500/10"
  },
  {
    title: "CO-PO Mapping",
    desc: "Smart correlation engine that automatically aligns course outcomes with program outcomes and PSOs.",
    icon: <AccountTreeIcon className="text-cyan-400" />,
    border: "group-hover:border-cyan-500/50",
    shadow: "group-hover:shadow-cyan-500/10"
  },
  {
    title: "Attainment Analytics",
    desc: "Real-time dashboards that visualize threshold levels and target achievement for accreditation audits.",
    icon: <BarChartIcon className="text-indigo-400" />,
    border: "group-hover:border-indigo-500/50",
    shadow: "group-hover:shadow-indigo-500/10"
  }
];

export default function Features() {
  return (
    <section className="relative py-24 bg-[#050507] overflow-hidden">
      {/* Decorative Glow */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" 
      />

      <Container maxWidth="lg" className="relative z-10">
        <Box className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="text-left"
          >
            <Typography className="text-orange-500 font-mono tracking-[0.3em] uppercase text-sm mb-4 font-bold">
              Core Capabilities
            </Typography>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Powerful Features for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Modern Educators</span>
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-gray-500 max-w-xs text-sm leading-relaxed"
          >
            Our suite of tools is designed to handle the heavy lifting of OBE compliance, so you can focus on teaching.
          </motion.p>
        </Box>

        <div className="grid md:grid-cols-3 gap-8">
          {featureList.map((feat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.15, type: "spring", bounce: 0.4 }}
              className="group h-full"
            >
              <Box 
                className={`relative h-full p-10 rounded-[3rem] bg-white/[0.02] border border-white/10 backdrop-blur-3xl transition-all duration-500 ${feat.border} ${feat.shadow} group-hover:bg-white/[0.05] group-hover:-translate-y-4`}
              >
                {/* Floating Icon Container */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: index * 0.5, ease: "easeInOut" }}
                >
                  <Box className="w-16 h-16 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    {React.cloneElement(feat.icon, { sx: { fontSize: 35 } })}
                  </Box>
                </motion.div>

                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  {feat.title}
                </h3>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                  {feat.desc}
                </p>

                {/* Subtle "Learn More" Link */}
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 group-hover:text-orange-500 transition-colors cursor-pointer">
                  Explore Feature 
                  <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                </div>
              </Box>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}