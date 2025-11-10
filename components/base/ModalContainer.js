// components/base/ModalContainer.js
// Container modal chung với hiệu ứng mở/đóng


import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ModalContainer({ show, onClose, children, width }) {
  if (!width) width = "max-w-2xl";
  if (!show) return null;

  return React.createElement(
    AnimatePresence,
    null,
    show &&
      React.createElement(
        motion.div,
        {
          className:
            "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm",
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          onClick: onClose,
        },
        React.createElement(
          motion.div,
          {
            onClick: (e) => e.stopPropagation(),
            className:
              "bg-white rounded-2xl shadow-2xl p-6 w-[90%] " +
              width +
              " relative overflow-y-auto max-h-[90vh]",
            initial: { scale: 0.9, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            exit: { scale: 0.9, opacity: 0 },
            transition: { type: "spring", damping: 20, stiffness: 200 },
          },
          children,
          React.createElement(
            "button",
            {
              onClick: onClose,
              className:
                "absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl",
            },
            "✕"
          )
        )
      )
  );
}
