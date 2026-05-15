import React, { useState, useEffect } from "react";
import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";


export default function Header() {
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

    const navigate = useNavigate();   // ✅ ADD THIS


  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;

      if (currentScroll > lastScroll) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      setLastScroll(currentScroll);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScroll]);

 

  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.3 }}
      className="fixed w-full z-50"
    >
      <AppBar
        position="static"
        elevation={0}
        className="!bg-black/30 backdrop-blur-lg border-b border-white/10"
      >
        <Toolbar className="flex justify-between px-6 lg:px-20 py-4">

          {/* Logo */}
          <Box className="flex items-center cursor-pointer">
            <span className="text-3xl font-black text-white">OBE</span>
            <span className="text-xl font-bold text-orange-500 ml-1">AI</span>
          </Box>

          {/* Menu */}
          <Box className="flex items-center space-x-4">

            

          </Box>

          {/* Buttons */}
          <Box className="flex items-center gap-4">

            {/* Login */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
              onClick={() => navigate("/login")}
              className="!text-white !font-bold !capitalize !px-6 hover:!bg-white/10 transition-all">
                Login
              </Button>
            </motion.div>

            {/* Get Started */}
            <motion.div
              whileHover={{
                scale: 1.1,
                boxShadow: "0px 0px 20px rgba(255,115,0,0.6)",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
              onClick={() => navigate("/register")}
                variant="contained"
                className="!bg-orange-600 !text-white !rounded-full !px-8 !py-2 !font-bold !capitalize hover:!bg-orange-700 shadow-lg"
              >
                Get Started
              </Button>
            </motion.div>

          </Box>

        </Toolbar>
      </AppBar>
    </motion.div>
  );
}