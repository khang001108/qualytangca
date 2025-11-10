// components/base/ToastContext.js
// Context hiển thị toast thông báo


import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ToastContext = createContext();
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type) => {
    if (!type) type = "success";
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return React.createElement(
    ToastContext.Provider,
    { value: { showToast } },
    children,
    React.createElement(
      AnimatePresence,
      null,
      toast &&
        React.createElement(
          motion.div,
          {
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -20 },
            className:
              "fixed top-6 right-6 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-[100] " +
              (toast.type === "error" ? "bg-red-500" : "bg-green-500"),
          },
          toast.msg
        )
    )
  );
}
