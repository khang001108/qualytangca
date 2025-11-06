import React, { useRef } from "react";
import { Loader2 } from "lucide-react";

export default function PopupSelect({
  title,
  confirmText,
  onConfirm,
  onCancel,
  members,
  selectedIds,
  toggleSelect,
  toggleAll,
  inputValue,
  setInputValue,
  loading,
  color,
}) {
  const ref = useRef();
  const colorClass =
    color === "red"
      ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
      : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800";
  const textColor =
    color === "red"
      ? "text-red-600 dark:text-red-400"
      : "text-indigo-600 dark:text-indigo-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        ref.current && !ref.current.contains(e.target) && onCancel()
      }
    >
      {/* Overlay mờ nền */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Popup chính */}
      <div
        ref={ref}
        className="relative bg-white dark:bg-gray-900 w-11/12 max-w-lg p-6 rounded-xl shadow-2xl z-10 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 transition-colors"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Tiêu đề popup */}
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-lg font-semibold ${textColor}`}>{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Ô nhập số giờ (nếu có) */}
        {setInputValue && (
          <div className="mb-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Giới hạn (giờ/tháng)
            </label>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập số giờ hợp lệ"
              className="w-full border p-2 rounded mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
            />
          </div>
        )}

        {/* Danh sách nhân viên */}
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Chọn nhân viên
          </label>
          <button
            type="button"
            onClick={toggleAll}
            className={`text-xs ${textColor} hover:underline`}
          >
            {selectedIds.length === members.length
              ? "Bỏ chọn tất cả"
              : "Chọn tất cả"}
          </button>
        </div>

        <div className="border rounded-lg max-h-60 overflow-y-auto p-2 space-y-1 border-gray-300 dark:border-gray-700">
          {members.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
              Không có nhân viên.
            </p>
          ) : (
            members.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(m.id)}
                  onChange={() => toggleSelect(m.id)}
                />
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {m.realName}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  ({m.nickname})
                </span>
              </label>
            ))
          )}
        </div>

        {/* Nút hành động */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 min-w-[120px] bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition"
          >
            Quay lại
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2 min-w-[120px] rounded flex justify-center items-center gap-2 ${colorClass} text-white disabled:opacity-70 transition`}
          >
            {loading ? (
              <>
                <span>Đang lưu...</span>
                <Loader2 className="w-5 h-5 mx-auto animate-spin" />
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
