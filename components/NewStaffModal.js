// components/NewStaffModal.js
import { useRef } from "react";
import { Edit2 } from "lucide-react";

export default function NewStaffModal({
  newStaffDetected = [],
  setNewStaffDetected = () => {},
  onConfirm = () => {},
}) {
  const modalRef = useRef();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Nền mờ */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Hộp modal */}
      <div
        ref={modalRef}
        className="relative bg-white w-11/12 max-w-2xl p-6 rounded-xl shadow-2xl z-10"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-semibold">🆕 Nhân viên mới phát hiện</h4>
          <button
            onClick={() => setNewStaffDetected([])}
            className="text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Bảng nhân viên */}
        <div className="border border-gray-300 rounded p-3 max-h-96 overflow-y-auto">
          {/* Tiêu đề bảng */}
          <div className="grid grid-cols-[24px_1fr_64px_100px_100px_100px_24px] font-semibold text-sm border-b pb-1 mb-1">
            <span></span>
            <span>Họ tên</span>
            <span>Tên</span>
            <span>Ca</span>
            <span>Giờ lên ca</span>
            <span>Giờ chấm công</span>
            <span></span>
          </div>

          {/* Danh sách nhân viên */}
          {newStaffDetected.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-3">
              Không có nhân viên mới
            </p>
          ) : (
            newStaffDetected.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[24px_1fr_64px_100px_100px_100px_24px] items-center gap-2 border-b border-gray-200 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={s.selected}
                  onChange={(e) =>
                    setNewStaffDetected((prev) =>
                      prev.map((m) =>
                        m.id === s.id ? { ...m, selected: e.target.checked } : m
                      )
                    )
                  }
                />

                <span className="truncate">{s.realName}</span>

                <input
                  className="w-14 border rounded px-1 text-sm"
                  value={s.nickname}
                  onChange={(e) =>
                    setNewStaffDetected((prev) =>
                      prev.map((m) =>
                        m.id === s.id
                          ? { ...m, nickname: e.target.value }
                          : m
                      )
                    )
                  }
                />

                <select
                  className="border rounded px-1 text-sm"
                  value={s.shift}
                  onChange={(e) =>
                    setNewStaffDetected((prev) =>
                      prev.map((m) =>
                        m.id === s.id
                          ? { ...m, shift: e.target.value }
                          : m
                      )
                    )
                  }
                >
                  <option value="Ca ngày">Ca ngày</option>
                  <option value="Ca đêm">Ca đêm</option>
                </select>

                <select
                  className="border rounded px-1 text-sm"
                  value={s.shiftStart}
                  onChange={(e) =>
                    setNewStaffDetected((prev) =>
                      prev.map((m) =>
                        m.id === s.id
                          ? { ...m, shiftStart: e.target.value }
                          : m
                      )
                    )
                  }
                >
                  <option value="07:00">07:00</option>
                  <option value="08:00">08:00</option>
                  <option value="19:00">19:00</option>
                  <option value="20:00">20:00</option>
                </select>

                <span className="text-xs text-gray-500">{s.checkIn}</span>
                <Edit2 className="w-4 h-4 text-gray-400" />
              </div>
            ))
          )}
        </div>

        {/* Nút hành động */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            onClick={() => setNewStaffDetected([])}
          >
            Hủy
          </button>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded hover:brightness-110"
            onClick={onConfirm}
          >
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}
