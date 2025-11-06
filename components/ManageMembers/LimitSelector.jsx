import React, { useRef } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function LimitSelector({
  title = "Giới hạn tăng ca",
  confirmText = "Lưu thay đổi",
  onConfirm,
  onCancel,
  members = [],
  selectedIds = [],
  toggleSelect,
  toggleAll,
  inputValue,
  setInputValue,
  loading,
  color = "indigo",
}) {
  const modalRef = useRef();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        modalRef.current &&
        !modalRef.current.contains(e.target) &&
        onCancel?.()
      }
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="relative bg-white dark:bg-gray-800 w-11/12 max-w-md p-5 rounded-xl shadow-2xl text-gray-800 dark:text-gray-200 z-10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* --- Input nhập giới hạn --- */}
        <div className="mb-4">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Giới hạn tăng ca (giờ)
          </label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nhập số giờ giới hạn..."
            className="w-full border p-2 rounded mt-1 bg-white dark:bg-gray-700 
                       border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 
                       placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* --- Danh sách nhân viên --- */}
        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md mb-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">
                  <input
                    type="checkbox"
                    onChange={toggleAll}
                    checked={
                      members.length > 0 &&
                      selectedIds.length === members.length
                    }
                  />
                </th>
                <th className="p-2 text-left">Tên nhân viên</th>
                <th className="p-2 text-right">Giới hạn</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-3 text-gray-400">
                    Không có nhân viên
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.id}
                    className={`border-t border-gray-200 dark:border-gray-700 hover:bg-${color}-50 dark:hover:bg-gray-700`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleSelect(m.id)}
                      />
                    </td>
                    <td className="p-2">{m.realName}</td>
                    <td className="p-2 text-right text-gray-500">
                      {m.overtimeLimit?.monthlyLimit || 0}h
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* --- Nút hành động --- */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1.5 rounded text-sm"
          >
            <XCircle className="w-4 h-4" />
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-1 bg-${color}-600 hover:bg-${color}-700 text-white px-3 py-1.5 rounded text-sm`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
