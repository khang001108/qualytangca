import React from "react";
import { Trash2, Save, Loader2 } from "lucide-react";

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
        mt-6 -mx-6 px-6 pt-4 pb-3
        flex justify-between items-center
        border-t border-gray-300 dark:border-gray-700
      "
    >
      {/* BTN DELETE MONTH */}
      <button
        onClick={handleDeleteAll}
        className="
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-red-600 hover:bg-red-700 text-white
          shadow active:scale-[0.97] transition
        "
      >
        <Trash2 className="w-4 h-4" />
        Xóa tháng
      </button>

      <div className="flex items-center gap-3">

        {/* BTN SAVE — gộp progress vào đây */}
        <button
          onClick={handleApply}
          disabled={loading}
          className={`
            flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold
            text-white shadow-md border border-purple-600 transition active:scale-[0.97]
            ${
              loading
                ? "bg-purple-500 animate-pulse cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            }
          `}
        >
          {loading && savingProgress ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                Đang lưu {savingProgress.index}/{savingProgress.total}
              </span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu phân ca</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
