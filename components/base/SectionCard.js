// components/base/SectionCard.js
// Card hiển thị một phần cấu hình với tiêu đề và biểu tượng


import React from "react";
import { motion } from "framer-motion";

export default function SectionCard({ icon: Icon, title, color, children }) {
  if (!color) color = "indigo";

  const colorMap = {
    indigo:
      "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600",
    yellow:
      "border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 text-yellow-600",
    red: "border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600",
    green:
      "border-green-200 hover:border-green-400 hover:bg-green-50 text-green-600",
  };

  return React.createElement(
    motion.div,
    {
      className:
        "border rounded-xl p-4 mb-4 transition " + (colorMap[color] || ""),
      whileHover: { scale: 1.01 },
    },
    React.createElement(
      "div",
      { className: "flex items-center gap-2 mb-3 font-semibold" },
      Icon ? React.createElement(Icon, { className: "w-5 h-5" }) : null,
      React.createElement("span", null, title)
    ),
    children
  );
}
