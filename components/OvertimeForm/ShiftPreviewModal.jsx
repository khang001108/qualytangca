import React from "react";

/*
Props:
- visible: boolean
- pending: array of { memberId, name, oldShiftStart, newShiftStart }
- onClose: () => void
- onApprove: async () => void
- onSkip: () => void
- loading: boolean
*/

export default function ShiftPreviewModal({ visible, pending = [], onClose, onApprove, onSkip, loading }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-gray-900 w-11/12 max-w-xl rounded-2xl p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-orange-600 mb-3">Xác nhận cập nhật phân ca</h3>

        <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          <div>Có <strong>{pending.length}</strong> thay đổi phân ca được phát hiện. Bạn muốn cập nhật vào hệ thống không?</div>
        </div>

        <div className="max-h-60 overflow-auto mb-4 text-sm">
          {pending.length === 0 && <div className="text-gray-500">Không có thay đổi nào.</div>}
          {pending.map((p, i) => (
            <div key={i} className="flex justify-between items-center gap-3 py-2 border-b last:border-b-0">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">
                  Hiện tại: {p.oldShiftStart || "Không có"} → Mới: <span className="text-green-600">{p.newShiftStart}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
            disabled={loading}
          >
            Hủy
          </button>

          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg border bg-yellow-500 text-white"
            disabled={loading}
          >
            Bỏ qua (Không cập nhật)
          </button>

          <button
            onClick={onApprove}
            className="px-4 py-2 rounded-lg bg-green-600 text-white"
            disabled={loading}
          >
            {loading ? "Đang cập nhật..." : "Cập nhật & Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
