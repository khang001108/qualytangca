// components/ManageMembers/ShiftAssign/ShiftAssignFooter.jsx

import { Undo2, CardSim, Loader2 } from "lucide-react";

export default function ShiftAssignFooter({
  loading,
  onCancel,
  handleApply,
}) {
  return (
    <div className="flex justify-end gap-3">
      <button
        onClick={onCancel}
        className="px-5 py-2 rounded bg-gray-200 dark:bg-gray-800 border border-gray-300 
        dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 
        dark:hover:bg-gray-700 transition"
      >
        <Undo2 className="w-5 h-5 inline-block mr-1" />
        Quay lại
      </button>

      <button
        onClick={handleApply}
        disabled={loading}
        className="px-5 py-2 rounded bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 
        dark:hover:bg-purple-800 text-white flex items-center gap-2 disabled:opacity-70 transition"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
          </>
        ) : (
          <>
            <CardSim className="w-4 h-4" />
            Lưu phân ca
          </>
        )}
      </button>
    </div>
  );
}
