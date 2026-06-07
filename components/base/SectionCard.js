import React from "react";
import { motion } from "framer-motion";

export default function SectionCard({ icon: Icon, title, color = "indigo", children }) {
  const colorMap = {
    indigo: { icon: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/30" },
    yellow: { icon: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/30" },
    red:    { icon: "text-red-600 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-900/30" },
    green:  { icon: "text-green-600 dark:text-green-400",   bg: "bg-green-50 dark:bg-green-900/30" },
  };
  const { icon: iconColor, bg } = colorMap[color] || colorMap.indigo;

  return (
    <motion.div
      className="card mb-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -1 }}
    >
      {(Icon || title) && (
        <div className="flex items-center gap-2 mb-3">
          {Icon && (
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
          )}
          {title && <span className="font-semibold text-gray-900 dark:text-white text-sm">{title}</span>}
        </div>
      )}
      {children}
    </motion.div>
  );
}
