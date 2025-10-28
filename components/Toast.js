// app/Toast.js
import { useEffect } from "react";

export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose && onClose();
    }, 3000); // tự ẩn sau 3s
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-lg text-white shadow-lg text-sm animate-fade-in-out ${colors[type]}`}
    >
      {message}
    </div>
  );
}
