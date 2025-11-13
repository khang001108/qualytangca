// components/ManageMembers/ShiftAssign/ShiftAssignHeader.jsx

import { Trash2 } from "lucide-react";

export default function ShiftAssignHeader({
  selectedMonth,
  selectedYear,
  handleDeleteAll,
  loading,
}) {
  return (
    <h3 className="text-lg font-semibold mb-3 text-purple-600 dark:text-purple-400 flex justify-between items-center">
      <span>🗓️ Phân ca tháng {selectedMonth}/{selectedYear}</span>

      <button
        onClick={handleDeleteAll}
        disabled={loading}
        className="flex items-center gap-1 text-sm px-2 py-1 bg-red-100 dark:bg-red-900/30 
        hover:bg-red-200 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 rounded"
      >
        <Trash2 className="w-4 h-4" /> Xóa tháng
      </button>
    </h3>
  );
}
