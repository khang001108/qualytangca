// components/OvertimeForm/ShiftPreviewModal.jsx — Mobile-friendly
import { X, Loader2, ArrowRight } from "lucide-react";

export default function ShiftPreviewModal({ visible, pending = [], onClose, onApprove, onSkip, loading }) {
  if (!visible) return null;

  const friendlyLabel = (s = "") =>
    s.replace("lên_ca_ngày_", "Ca ngày — ").replace("lên_ca_đêm_", "Ca đêm — ").replace("_", " ");

  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 glass-overlay" />
      <div className="relative z-10 w-full sm:w-11/12 sm:max-w-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeSlideUp overflow-hidden">

        <div className="flex justify-between items-center px-5 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <h3 className="font-semibold">Cập nhật phân ca?</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition"><X size={20} /></button>
        </div>

        <div className="px-4 py-3 space-y-2.5 max-h-[50vh] overflow-y-auto modal-scroll">
          <p className="text-sm text-gray-500 dark:text-gray-400">Phát hiện ca làm thay đổi so với hồ sơ:</p>
          {pending.map((u) => (
            <div key={u.memberId} className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">{u.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                  <span className="text-red-400 line-through">{friendlyLabel(u.oldShiftStart)}</span>
                  <ArrowRight size={10} />
                  <span className="text-green-500">{friendlyLabel(u.newShiftStart)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button onClick={onSkip} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            Bỏ qua
          </button>
          <button onClick={onApprove} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium flex items-center justify-center gap-2 transition">
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Cập nhật & Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
