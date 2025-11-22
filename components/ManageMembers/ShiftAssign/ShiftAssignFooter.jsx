import React from "react";
import { Trash2, Undo2, Save, Loader2 } from "lucide-react";

export default function ShiftAssignFooter({
  loading,
  savingProgress,
  onCancel,
  handleApply,
  handleDeleteAll,
}) {
  return (
    <div
      className="
        mt-6 -mx-6 px-6 pt-4 pb-2
        flex justify-between items-center
        border-t 
        border-gray-300 dark:border-gray-700
      "
    >
      <button
        onClick={handleDeleteAll}
        className="
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-red-600 hover:bg-red-700 text-white
          shadow-md active:scale-[0.97] transition
        "
      >
        <Trash2 className="w-4 h-4" />
        Xóa tháng
      </button>

      <div className="flex items-center gap-3">

        {/* TIẾN TRÌNH LƯU - STYLE MỚI */}
        {loading && savingProgress && (
          <div
            className="
              flex items-center gap-2
              px-3 py-1.5
              bg-purple-600/20 border border-purple-500/30
              text-purple-300 rounded-lg
              text-xs font-medium
            "
          >
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            Đang lưu ngày {savingProgress.day} ({savingProgress.index}/{savingProgress.total})
          </div>
        )}

        <button
          onClick={onCancel}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm 
            bg-gray-300 dark:bg-gray-700 
            hover:bg-gray-400 dark:hover:bg-gray-600
          "
        >
          <Undo2 className="w-4 h-4" />
          Quay lại
        </button>

        <button
          onClick={handleApply}
          disabled={loading}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            bg-purple-600 hover:bg-purple-700 
            text-white shadow-md border border-purple-500
            active:scale-[0.97] transition disabled:opacity-70
          "
        >
          <Save className="w-4 h-4" />
          Lưu phân ca
        </button>
      </div>
    </div>
  );
}
