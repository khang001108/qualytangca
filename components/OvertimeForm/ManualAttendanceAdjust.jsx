import { X, Save, Clock } from "lucide-react";
import React, { useState, useEffect } from "react";

export default function ManualAttendanceAdjust({
  visible,
  item,
  onClose,
  onSave,
  leaveMap = {},
}) {
  if (!visible || !item) return null;

  const [leaveType, setLeaveType] = useState("");
  const [session, setSession] = useState("none"); // morning / afternoon / full / none
  const [withOT, setWithOT] = useState(false);
  const [otHours, setOtHours] = useState(0);

  useEffect(() => {
    if (!item) return;

    setLeaveType(item.leaveType || "");
    setSession(item.session || "none");

    const minutes = item?.otMinutes || 0;

    setWithOT(minutes > 0);
    setOtHours(minutes > 0 ? minutes / 60 : 0);
  }, [item]);

  const handleSubmit = () => {
    onSave({
      memberId: item.memberId,
      leaveType,
      session,
      withOT,
      otHours: withOT ? Number(otHours) : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-10 w-11/12 max-w-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-2xl shadow-2xl p-6 border border-gray-300 dark:border-gray-700">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
            Xử lý thủ công
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X />
          </button>
        </div>

        {/* Tên nhân viên */}
        <div className="text-base font-semibold mb-3">
          {item.realName}
          {item.nickname && (
            <span className="ml-1 text-gray-500 text-sm">
              ({item.nickname})
            </span>
          )}
        </div>

        {/* Leave type */}
        <label className="block text-sm mb-1">Chọn loại phép:</label>
        <select
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 mb-4"
        >
          <option value="">-- Không nghỉ --</option>
          {Object.entries(leaveMap).map(([code, label]) => (
            <option key={code} value={code}>
              {code} — {label}
            </option>
          ))}
        </select>

        {/* Session */}
        <label className="block text-sm mb-1">Chọn phiên nghỉ:</label>
        <select
          value={session}
          onChange={(e) => setSession(e.target.value)}
          className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 mb-4"
        >
          <option value="none">Không chọn</option>
          <option value="morning">Nghỉ sáng</option>
          <option value="afternoon">Nghỉ chiều</option>
          <option value="full">Nghỉ cả ngày</option>
        </select>

        {/* OT toggle */}
        <label className="flex items-center gap-2 text-sm mb-2">
          <input
            type="checkbox"
            checked={withOT}
            onChange={() => setWithOT(!withOT)}
            className="accent-orange-500"
          />
          Có tăng ca
        </label>

        {withOT && (
          <div className="mb-4">
            <label className="block text-sm mb-1 flex items-center gap-1">
              <Clock size={14} /> Số giờ tăng ca:
            </label>
            <input
              type="number"
              min="0"
              max="12"
              value={otHours}
              onChange={(e) => setOtHours(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          >
            <Save size={16} /> Lưu lại
          </button>
        </div>

      </div>
    </div>
  );
}
