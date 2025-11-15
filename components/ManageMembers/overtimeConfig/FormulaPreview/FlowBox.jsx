import React from "react";
import { motion } from "framer-motion";

export default function FlowBox({ id, title, subtitle, gradient, onClick }) {
  return (
    <motion.button
      onClick={() => onClick(id)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`w-full text-left px-4 py-3 rounded-2xl shadow-lg transform transition select-none
        bg-gradient-to-r ${gradient} text-white`}
    >
      <div className="font-semibold">{title}</div>
      {subtitle && <div className="text-xs opacity-90 mt-1">{subtitle}</div>}
    </motion.button>
  );
}
