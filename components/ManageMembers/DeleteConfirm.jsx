import React from "react";
import { Loader2, Trash2, Undo2 } from "lucide-react";

export default function DeleteConfirm({
  members = [],
  selectedIds = [],
  toggleSelect,
  toggleAll,
  loading,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* --- Nền mờ --- */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* --- Hộp chính --- */}
      <div className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 w-11/12 max-w-md p-6 rounded-xl shadow-2xl z-10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Xóa nhân viên
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* --- Danh sách nhân viên --- */}
        <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="p-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      members.length > 0 &&
                      selectedIds.length === members.length
                    }
                    onChange={toggleAll}
                    className="accent-red-600"
                  />
                </th>
                <th className="p-2 text-left">Tên nhân viên</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan="2"
                    className="text-center py-3 text-gray-400 dark:text-gray-500"
                  >
                    Không có nhân viên.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.id}
                    className={`border-t border-gray-200 dark:border-gray-700 ${
                      selectedIds.includes(m.id)
                        ? "bg-red-100 dark:bg-red-900/40"
                        : ""
                    }`}
                  >
                    <td className="text-center p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleSelect(m.id)}
                        className="accent-red-600"
                      />
                    </td>
                    <td className="p-2">{m.realName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- Nút xác nhận --- */}
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Xóa đã chọn</span>
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 dark:bg-gray-700 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <Undo2 className="w-4 h-4 inline-block mr-1" />
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
