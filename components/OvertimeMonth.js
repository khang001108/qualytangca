import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";

export default function OvertimeMonth({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  selectedDate,
  setSelectedDate,
  onDateSelect, // ⚙️ callback để load lại members theo ngày
  shiftSchedules = {},
}) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef();

  const today = dayjs();
  const firstDay = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`);
  const days = new Array(firstDay.daysInMonth())
    .fill(0)
    .map((_, i) => firstDay.date(i + 1));

  // click outside → close popup
  useEffect(() => {
    const handleOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // chọn ngày
  const handleSelectDate = (d) => {
    setSelectedDate?.(d);
    setSelectedMonth?.(d.month() + 1);
    setSelectedYear?.(d.year());
    onDateSelect?.(d); // 🔹 Gọi callback để đổi dữ liệu member
  };

  return (
    <div className="relative inline-block">
      {/* --- Nút mở lịch --- */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 text-sm text-gray-700"
      >
        📅{" "}
        {selectedDate
          ? dayjs(selectedDate).format("DD/MM/YYYY")
          : "Chọn ngày"}
      </button>

      {/* --- Popup lịch nhỏ --- */}
      {open && (
        <div
          ref={popupRef}
          className="absolute z-50 mt-2 bg-white border rounded-xl shadow-lg p-3 w-64"
        >
          {/* Header chọn tháng/năm */}
          <div className="flex items-center justify-between mb-2 text-sm">
            <button
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear(selectedYear - 1);
                } else setSelectedMonth(selectedMonth - 1);
              }}
              className="px-2 py-1 rounded hover:bg-gray-100"
            >
              ⬅
            </button>

            <span className="font-medium text-gray-700">
              {selectedMonth}/{selectedYear}
            </span>

            <button
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear(selectedYear + 1);
                } else setSelectedMonth(selectedMonth + 1);
              }}
              className="px-2 py-1 rounded hover:bg-gray-100"
            >
              ➡
            </button>
          </div>

          {/* Lưới ngày */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
              <div key={d} className="font-semibold text-gray-500 py-1">
                {d}
              </div>
            ))}

            {days.map((d) => {
              const dateStr = d.format("YYYY-MM-DD");
              const isToday = dateStr === today.format("YYYY-MM-DD");
              const isSelected =
                selectedDate &&
                dayjs(selectedDate).format("YYYY-MM-DD") === dateStr;

              const shiftMap = shiftSchedules[dateStr] || {};
              const counts = { day: 0, night: 0 };
              Object.values(shiftMap).forEach((s) => {
                if (s.shift?.toLowerCase().includes("đêm")) counts.night++;
                else counts.day++;
              });

              const bg =
                counts.day > counts.night
                  ? "bg-yellow-50"
                  : counts.night > counts.day
                  ? "bg-indigo-50"
                  : "bg-white";

              return (
                <button
                  key={dateStr}
                  onClick={() => handleSelectDate(d)}
                  className={`p-2 rounded border text-xs ${bg} 
                    ${isToday ? "border-green-400" : "border-gray-200"} 
                    ${isSelected ? "bg-orange-100 border-orange-400" : ""} 
                    hover:scale-105 transition`}
                >
                  {d.date()}
                </button>
              );
            })}
          </div>

          {/* --- Nút đóng popup --- */}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs text-gray-700"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
