{newStaffDetected.length > 0 && (
    <div className="border border-gray-300 rounded p-3 mt-3 max-h-96 overflow-y-auto">
      <h4 className="font-semibold mb-2">Nhân viên mới phát hiện</h4>
  
      {/* ====== BẢNG TIÊU ĐỀ ====== */}
      <div className="grid grid-cols-[24px_1fr_56px_80px_80px_80px_24px] text-sm font-semibold border-b border-gray-300 pb-1 mb-1">
        <span></span> {/* Cột checkbox */}
        <span>Họ tên</span>
        <span>Tên</span>
        <span>Ca</span>
        <span>Giờ lên ca</span>
        <span>Giờ chấm công</span>
        <span></span> {/* Cột icon */}
      </div>
  
      {/* ====== DANH SÁCH NHÂN VIÊN ====== */}
      {newStaffDetected.map((s) => (
        <div
          key={s.id}
          className="grid grid-cols-[24px_1fr_56px_80px_80px_80px_24px] items-center gap-2 border-b border-gray-200 py-1 text-sm"
        >
          <input
            type="checkbox"
            checked={s.selected}
            onChange={(e) =>
              setNewStaffDetected((prev) =>
                prev.map((m) =>
                  m.id === s.id
                    ? { ...m, selected: e.target.checked }
                    : m
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
      ))}
  
      {/* ====== NÚT HÀNH ĐỘNG ====== */}
      <div className="flex justify-end gap-2 mt-2">
        <button
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
          onClick={() => setNewStaffDetected([])}
        >
          Hủy
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:brightness-110"
          onClick={addNewStaffConfirmed}
        >
          Thêm
        </button>
      </div>
    </div>
  )}
  