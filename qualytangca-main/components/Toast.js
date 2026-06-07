// components/Toast.js
// Hiển thị các thông báo dạng toast


import { useEffect } from "react";

export default function Toast({ toasts = [], onClose }) {
  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => onClose && onClose(t.id), 5000) // 5 giây
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, onClose]);

  if (!toasts.length) return null;

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    caution: "bg-yellow-500",
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-lg text-white shadow-lg text-sm animate-fade-in-out ${colors[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
