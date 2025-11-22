import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function OvertimePreviewModal({
  visible,
  items = [],
  onClose,
  onConfirm,
}) {
  const [skipList, setSkipList] = useState({});

  // ===== CHẶN CUỘN BACKGROUND =====
  useEffect(() => {
    if (visible) document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, [visible]);

  if (!visible) return null;

  const toggleSkip = (id) => {
    setSkipList((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toHHMM = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const roundHours = (minutes) => (minutes / 60).toFixed(1);

  const getOtColor = (hours) => {
    const h = Number(hours);
    if (h > 5) return "text-red-500 font-semibold";
    if (h > 3) return "text-yellow-400 font-semibold";
    return "text-green-400 font-medium";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="
          relative z-10 w-11/12 max-w-2xl 
          bg-gray-900 text-gray-200 
          rounded-2xl shadow-2xl border border-gray-700
          overflow-hidden
        "
      >
        {/* === HEADER === */}
        <div
          className="flex justify-between items-center px-5 py-3
                        bg-gradient-to-r from-green-500 to-green-600 text-white"
        >
          <h3 className="font-semibold text-lg">Xem trước tăng ca</h3>
          <button onClick={onClose} className="hover:text-gray-200 transition">
            <X size={22} />
          </button>
        </div>

        {/* === BODY === */}
        <div className="px-5 py-4 max-h-96 overflow-y-auto space-y-4">
          {items.map((it) => {
            const otH = roundHours(it.otMinutes);

            return (
              <div
                key={it.memberId}
                className="
                  border border-green-700 rounded-xl p-3 
                  bg-gray-800/40 shadow-inner
                "
              >
                <div className="flex items-center justify-between border-l-4 border-orange-500 pl-3">
                  {/* Tên */}
                  <div className="text-base font-semibold text-white">
                    {it.name}
                    {it.nickname && (
                      <span className="ml-1 text-gray-400 text-sm">
                        ({it.nickname})
                      </span>
                    )}
                  </div>

                  {/* Số giờ OT lớn bên phải */}
                  <div className={`text-xl font-bold ${getOtColor(otH)}`}>
                    {otH}h
                  </div>
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  Kết thúc ca hành chính: {toHHMM(it.shiftEnd)}
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-300 mt-2">
                  <input
                    type="checkbox"
                    checked={!!skipList[it.memberId]}
                    onChange={() => toggleSkip(it.memberId)}
                    className="accent-orange-500"
                  />
                  Bỏ qua nhân viên này
                </label>
              </div>
            );
          })}
        </div>

        {/* === FOOTER === */}
        <div className="flex gap-3 px-5 py-3 border-t border-gray-700 bg-gray-800">
          <button
            onClick={onClose}
            className="
              flex-1 py-2 rounded-xl 
              bg-gray-600 hover:bg-gray-700 
              text-white transition
            "
          >
            Hủy
          </button>

          <button
            onClick={() => onConfirm(skipList)}
            className="
              flex-1 py-2 rounded-xl 
              bg-green-600 hover:bg-green-700 
              text-white transition
            "
          >
            Xác nhận & Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
