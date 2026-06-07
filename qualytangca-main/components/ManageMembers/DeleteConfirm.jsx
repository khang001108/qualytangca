// components/ManageMembers/DeleteConfirm.jsx
// Popup xác nhận xóa nhân viên – giao diện đồng bộ style mới

import React from "react";
import { Loader2, Trash2, Undo2, X } from "lucide-react";

export default function DeleteConfirm({
  members = [],
  selectedIds = [],
  toggleSelect,
  toggleAll,
  loading,
  onConfirm,
  onCancel,
}) {
  const allChecked =
    members.length > 0 && selectedIds.length === members.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Nền mờ */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Popup */}
      <div
        className="
          relative z-10 w-11/12 max-w-lg 
          bg-white dark:bg-gray-900 
          text-gray-800 dark:text-gray-200 
          rounded-2xl shadow-2xl border border-gray-300 dark:border-gray-700 
          overflow-hidden animate-scaleIn
        "
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 
                        bg-gradient-to-r from-rose-500 to-red-600 text-white">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Trash2 size={18} /> Xóa nhân viên
          </h3>

          <button
            onClick={onCancel}
            className="hover:text-gray-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Danh sách */}
          <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-xl shadow-inner">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0 z-10">
                <tr>
                  <th className="p-2 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
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
                      className="py-4 text-center text-gray-400 dark:text-gray-500"
                    >
                      Không có nhân viên.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => {
                    const checked = selectedIds.includes(m.id);

                    return (
                      <tr
                        key={m.id}
                        className={`
                          border-t border-gray-200 dark:border-gray-700 
                          transition-colors
                          ${checked ? "bg-red-100 dark:bg-red-900/40" : ""}
                        `}
                      >
                        <td className="text-center p-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(m.id)}
                            className="accent-red-600"
                          />
                        </td>

                        <td className="p-2 truncate">
                          {m.realName || "Không tên"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="
              flex-1 flex justify-center items-center gap-2 
              bg-red-600 hover:bg-red-700 
              disabled:bg-red-400 
              text-white py-2 rounded-xl shadow 
              transition-all duration-200
            "
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Xóa đã chọn
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            className="
              flex-1 flex justify-center items-center gap-2 
              bg-gray-200 dark:bg-gray-700 
              hover:bg-gray-300 dark:hover:bg-gray-600 
              text-gray-800 dark:text-gray-200 
              py-2 rounded-xl shadow 
              transition-all duration-200
            "
          >
            <Undo2 className="w-4 h-4" /> Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
