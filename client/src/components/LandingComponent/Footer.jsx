import React from "react";
import { Box, Grid, Typography, TextField, Button, IconButton, Divider } from "@mui/material";
import { motion } from "framer-motion";
import { Facebook as FacebookIcon, Linkedin as LinkedInIcon, Twitter as TwitterIcon, Instagram as InstagramIcon, ChevronUp as KeyboardArrowUpIcon } from 'lucide-react';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    // Changed: Removed fixed height constraints, kept bg black
    <footer className="relative bg-[#050507] text-white pt-20 pb-10 border-t border-white/5 w-full">
      
      {/* Changed: Replaced Container with a full-width Box with large horizontal padding */}
      <Box className="w-full px-6 md:px-12 lg:px-24">
        <Grid container spacing={6} justifyContent="space-between">
          
          {/* Column 1: Brand & Bio */}
          <Grid item xs={12} md={4} lg={3}>
            <Box className="flex items-center mb-6">
              <span className="text-4xl font-black text-orange-600 leading-none">V</span>
              <div className="flex items-baseline ml-1">
                <span className="text-2xl font-black tracking-tight text-orange-600 uppercase">OBE</span>
                <span className="text-2xl font-light tracking-widest text-white ml-1 uppercase">AI</span>
              </div>
            </Box>
            <Typography className="text-gray-400 text-sm leading-relaxed mb-8 max-w-sm">
              Empowering institutions with cutting-edge AI to automate Outcome-Based Education. 
              Efficiency, accuracy, and accreditation readiness in one platform.
            </Typography>
            <Box className="flex gap-4">
              {[<FacebookIcon />, <TwitterIcon />, <LinkedInIcon />, <InstagramIcon />].map((icon, i) => (
                <IconButton 
                  key={i} 
                  className="!p-0 !text-gray-500 hover:!text-orange-500 transition-all"
                >
                  {icon}
                </IconButton>
              ))}
            </Box>
          </Grid>

          {/* Column 2: Quick Links */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography className="font-bold mb-6 text-sm uppercase tracking-[0.2em] text-white">Platform</Typography>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              {['Features', 'How It Works', 'Solutions', 'Pricing'].map((link) => (
                <li key={link} className="hover:text-orange-500 cursor-pointer transition-colors">{link}</li>
              ))}
            </ul>
          </Grid>

          {/* Column 3: Company */}
          <Grid item xs={6} sm={3} md={2}>
            <Typography className="font-bold mb-6 text-sm uppercase tracking-[0.2em] text-white">Company</Typography>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              {['About Us', 'Contact', 'Privacy Policy', 'Terms'].map((link) => (
                <li key={link} className="hover:text-orange-500 cursor-pointer transition-colors">{link}</li>
              ))}
            </ul>
          </Grid>

          {/* Column 4: Newsletter */}
          <Grid item xs={12} md={3}>
            <Typography className="font-bold mb-6 text-sm uppercase tracking-[0.2em] text-white">Stay Updated</Typography>
            <Box className="flex flex-col gap-4">
              <TextField 
                placeholder="Enter your email" 
                variant="outlined" 
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderRadius: "12px",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  }
                }}
              />
              <Button 
                variant="contained" 
                fullWidth
                className="!bg-orange-600 !rounded-xl !py-3 !font-black !capitalize shadow-lg shadow-orange-600/20"
              >
                Subscribe
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Divider className="!bg-white/5 !mt-20 !mb-10" />

        {/* Bottom Bar */}
        <Box className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Typography className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">
            © 2026 VirtualBot AI Automation. All Rights Reserved.
          </Typography>
          
          <motion.button
            whileHover={{ y: -3 }}
            onClick={scrollToTop}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors"
          >
            Back to Top <KeyboardArrowUpIcon fontSize="small" />
          </motion.button>
        </Box>
      </Box>
    </footer>
  );
}