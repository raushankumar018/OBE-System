import React from "react";
import { TextField, Button, Box, Container, IconButton } from "@mui/material";
import { motion } from "framer-motion";
import { Facebook as FacebookIcon, Twitter as TwitterIcon, Linkedin as LinkedInIcon, Phone as PhoneIcon, Mail as EmailIcon, MapPin as LocationOnIcon } from 'lucide-react';

export default function ContactUs() {
  const inputStyle = {
    "& .MuiOutlinedInput-root": {
      color: "white",
      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
      "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
      "&.Mui-focused fieldset": { borderColor: "#ea580c" },
    },
    "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.5)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#ea580c" },
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: "12px",
  };

  return (
    <section className="relative py-24 bg-[#050507] overflow-hidden">
      {/* Decorative Background Element */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />

      <Container maxWidth="lg" className="relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* LEFT: Contact Info & Socials */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-10"
          >
            <div>
              <h4 className="text-orange-500 font-mono tracking-widest uppercase text-sm mb-4 font-bold">
                Get In Touch
              </h4>
              <h2 className="text-5xl font-black text-white leading-tight">
                Ready to transform <br /> your <span className="text-orange-600">curriculum?</span>
              </h2>
            </div>

            <div className="space-y-6">
              <Box className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-orange-500 transition-colors">
                  <PhoneIcon className="text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Call Us</p>
                  <p className="text-white font-medium">+1 (234) 567-890</p>
                </div>
              </Box>

              <Box className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-orange-500 transition-colors">
                  <EmailIcon className="text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Email</p>
                  <p className="text-white font-medium">hello@virtualbot.ai</p>
                </div>
              </Box>
            </div>

            {/* Social Media Links */}
            <div className="pt-8">
              <p className="text-xs text-gray-500 uppercase font-bold mb-4 tracking-widest">Follow the innovation</p>
              <div className="flex gap-4">
                {[<FacebookIcon />, <TwitterIcon />, <LinkedInIcon />].map((icon, i) => (
                  <IconButton key={i} className="!bg-white/5 !text-white hover:!bg-orange-600 hover:!scale-110 transition-all border border-white/10">
                    {icon}
                  </IconButton>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Modern Contact Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white/[0.03] border border-white/10 backdrop-blur-2xl p-10 rounded-[3rem] shadow-2xl"
          >
            <div className="space-y-6">
              <TextField label="Full Name" fullWidth sx={inputStyle} />
              <TextField label="Work Email" fullWidth sx={inputStyle} />
              <TextField label="Message" multiline rows={4} fullWidth sx={inputStyle} />

              <Button 
                variant="contained" 
                fullWidth
                className="!bg-orange-600 !py-4 !rounded-2xl !font-black !text-lg !capitalize hover:!bg-orange-700 shadow-[0_10px_20px_rgba(234,88,12,0.3)]"
              >
                Send Message
              </Button>
            </div>
          </motion.div>

        </div>
      </Container>
    </section>
  );
}