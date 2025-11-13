import React from "react";
import { Trash2, Undo2, Save } from "lucide-react";

export default function ShiftAssignFooter({
  loading,
  onCancel,
  handleApply,
  handleDelete,
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
      {/* Nút xóa tháng */}
      <button
        onClick={handleDelete}
        className="
          flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
          bg-red-600 hover:bg-red-700 text-white
          shadow-md active:scale-[0.97] transition
        "
      >
        <Trash2 className="w-5 h-5" />
        Xóa tháng
      </button>

      {/* Nút Quay lại + Lưu phân ca */}
      <div className="flex gap-4">

        {/* Quay lại */}
        <button
          onClick={onCancel}
          className="
            flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
            bg-gray-200 text-gray-700 hover:bg-gray-300
            dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600
            shadow-sm border border-gray-300 dark:border-gray-600
            active:scale-[0.97] transition
          "
        >
          <Undo2 className="w-5 h-5" />
          Quay lại
        </button>

        {/* Lưu phân ca */}
        <button
          onClick={handleApply}
          disabled={loading}
          className="
            flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium
            bg-purple-600 hover:bg-purple-700 
            text-white shadow-md border border-purple-500
            active:scale-[0.97] transition disabled:opacity-70
          "
        >
          <Save className="w-5 h-5" />
          Lưu phân ca
        </button>
      </div>
    </div>
  );
}
