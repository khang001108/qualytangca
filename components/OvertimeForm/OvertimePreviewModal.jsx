// components/OvertimeForm/OvertimePreviewModal.jsx — Mobile-friendly
import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";

const toHHMM = (minutes) => {
  if (minutes == null) return "--:--";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
};
const roundDown = (minutes) => {
  if (minutes == null) return "--:--";
  return `${String(Math.floor(minutes / 60)).padStart(2,"0")}:00`;
};

export default function OvertimePreviewModal({ visible, items = [], onClose, onConfirm, onManualAdjust }) {
  const [skipList, setSkipList] = useState({});

  useEffect(() => {
    if (visible) { document.body.style.overflow = "hidden"; setSkipList({}); }
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  if (!visible) return null;

  const toggle = (id) => setSkipList((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 glass-overlay" onClick={onClose} />
      <div className="relative z-10 w-full sm:w-11/12 sm:max-w-xl bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeSlideUp overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <h3 className="font-semibold">Xem trước tăng ca</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="modal-scroll px-4 py-3 max-h-[60vh] overflow-y-auto space-y-3">
          {items.map((it) => {
            const otH     = (it.otMinutes / 60).toFixed(1);
            const hasError = it.error && it.error !== "fixed";
            const isFixed  = it.error === "fixed";

            return (
              <div key={it.memberId} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Member row */}
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {it.name}
                      {it.nickname && <span className="ml-1.5 text-xs text-gray-400">({it.nickname})</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {it.leaveType
                        ? `Phép: ${it.leaveLabel || it.leaveType}`
                        : `Hết ca: ${toHHMM(it.shiftEnd)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(hasError || isFixed) && (
                      <button
                        onClick={() => onManualAdjust(it)}
                        className={`p-1.5 rounded-lg transition ${isFixed ? "text-green-500 hover:text-green-600" : "text-red-500 hover:text-red-600"}`}
                      >
                        {isFixed ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                      </button>
                    )}
                    <div className="text-right">
                      <div className={`text-xl font-bold leading-none ${Number(otH)>5?"text-red-500":Number(otH)>3?"text-yellow-500":"text-green-500"}`}>
                        {otH}h
                      </div>
                      <div className="text-[10px] text-gray-400">ra {roundDown(it.checkoutMinutes)}</div>
                    </div>
                  </div>
                </div>

                {/* Error notice */}
                {hasError && (
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 text-xs text-red-600 dark:text-red-400">
                    {it.error === "notYet" ? "⚠️ Chưa tới giờ tăng ca" : "ℹ️ Không có tăng ca — nhấn ⚠️ để xử lý thủ công"}
                  </div>
                )}

                {/* Skip toggle */}
                <label className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <input type="checkbox" checked={!!skipList[it.memberId]} onChange={() => toggle(it.memberId)} className="accent-orange-500 w-4 h-4" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Bỏ qua nhân viên này</span>
                </label>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            Hủy
          </button>
          <button onClick={() => onConfirm(skipList)} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition">
            Xác nhận & Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
