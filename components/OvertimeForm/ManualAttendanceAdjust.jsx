// components/OvertimeForm/ManualAttendanceAdjust.jsx
import { useState, useEffect } from "react";
import { X, Save, Clock } from "lucide-react";

export default function ManualAttendanceAdjust({ visible, item, onClose, onSave, leaveMap = {} }) {
  const [leaveType, setLeaveType] = useState("");
  const [session,   setSession]   = useState("none");
  const [withOT,    setWithOT]    = useState(false);
  const [otHours,   setOtHours]   = useState(0);

  useEffect(() => {
    if (!item) return;
    setLeaveType(item.leaveType || "");
    setSession(item.session || "none");
    const mins = item?.otMinutes || 0;
    setWithOT(mins > 0);
    setOtHours(mins > 0 ? mins / 60 : 0);
  }, [item]);

  useEffect(() => {
    if (!visible) { setLeaveType(""); setSession("none"); setWithOT(false); setOtHours(0); }
  }, [visible]);

  if (!visible || !item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 glass-overlay" onClick={onClose} />
      <div className="relative z-10 w-full sm:w-11/12 sm:max-w-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 animate-fadeSlideUp">

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-orange-600 dark:text-orange-400">Xử lý thủ công</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"><X size={20} /></button>
        </div>

        <div className="font-semibold mb-4 text-gray-900 dark:text-white">
          {item.name}{item.nickname && <span className="ml-1.5 text-sm text-gray-400">({item.nickname})</span>}
        </div>

        {/* Leave type */}
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Loại phép</label>
        <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
          className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm mb-3 outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">-- Không nghỉ --</option>
          {Object.entries(leaveMap).map(([code, label]) => (
            <option key={code} value={code}>{code} — {label}</option>
          ))}
        </select>

        {/* Session */}
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Phiên nghỉ</label>
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {[{v:"none",l:"Không"},{v:"morning",l:"Sáng"},{v:"afternoon",l:"Chiều"},{v:"full",l:"Cả ngày"}].map((opt) => (
            <button key={opt.v} onClick={() => setSession(opt.v)}
              className={`py-2 rounded-lg text-xs font-medium transition ${session===opt.v ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
              {opt.l}
            </button>
          ))}
        </div>

        {/* OT toggle */}
        <label className="flex items-center gap-2.5 cursor-pointer mb-3">
          <div onClick={() => setWithOT((v) => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative ${withOT ? "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${withOT ? "translate-x-5" : ""}`} />
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Có tăng ca</span>
        </label>

        {withOT && (
          <div className="flex items-center gap-3 mb-4">
            <Clock size={16} className="text-gray-400 shrink-0" />
            <label className="text-sm text-gray-600 dark:text-gray-300 shrink-0">Số giờ:</label>
            <input type="number" min="0" max="12" step="0.5" value={otHours}
              onChange={(e) => setOtHours(e.target.value)}
              className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">Hủy</button>
          <button onClick={() => onSave({ memberId: item.memberId, leaveType, session, withOT, otHours: withOT ? Number(otHours) : 0 })}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition">
            <Save size={15} /> Lưu lại
          </button>
        </div>
      </div>
    </div>
  );
}
