import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";

export default function OvertimeMonth({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  selectedDate,
  setSelectedDate,
  onDateSelect,
  shiftSchedules = {},
}) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef();
  const today = dayjs();

  const daysInMonth = dayjs(
    `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
  ).daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) =>
    dayjs(
      `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(
        i + 1
      ).padStart(2, "0")}`
    )
  );

  useEffect(() => {
    const handleOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSelectDate = (dateStr) => {
    const d = dayjs(dateStr);
    setSelectedDate?.(d.toDate());
    setSelectedMonth?.(d.month() + 1);
    setSelectedYear?.(d.year());
    onDateSelect?.(d);
  };

  return (
    <div className="relative inline-block">
      {/* --- Nút mở lịch --- */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 transition"
      >
        📅{" "}
        {selectedDate ? dayjs(selectedDate).format("DD/MM/YYYY") : "Chọn ngày"}
      </button>

      {/* --- Popup lịch --- */}
      {open && (
        <div
          ref={popupRef}
          className="absolute z-50 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3 w-64 text-gray-800 dark:text-gray-200"
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
              className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ⬅
            </button>

            <span className="font-medium text-gray-700 dark:text-gray-200">
              {selectedMonth}/{selectedYear}
            </span>

            <button
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear(selectedYear + 1);
                } else setSelectedMonth(selectedMonth + 1);
              }}
              className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              ➡
            </button>
          </div>

          {/* Lưới ngày */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
              <div
                key={d}
                className="font-semibold text-gray-500 dark:text-gray-400 py-1"
              >
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

              // Màu nền cho từng ngày
              let bg = "bg-white dark:bg-gray-800";

              // 🌙 Ca đêm → tím sáng hơn, dễ phân biệt trên dark mode
              if (counts.night > 0) bg = "bg-indigo-100 dark:bg-indigo-800/50";
              // ☀️ Ca ngày → vàng tươi hơn
              else if (counts.day > 0)
                bg = "bg-yellow-100 dark:bg-yellow-700/40";

              // Viền và nền ưu tiên cho ngày hiện tại / được chọn
              const border = isSelected
                ? "border-green-500 bg-green-300 dark:bg-green-500 dark:border-green-200"
                : isToday
                ? "border-orange-500 bg-orange-200 dark:bg-orange-600 dark:border-orange-400"
                : "border-gray-300 dark:border-gray-600";

              return (
                <button
                  key={dateStr}
                  onClick={() => handleSelectDate(dateStr)}
                  className={`p-2 rounded border text-xs ${bg} ${border} hover:scale-105 transition`}
                >
                  {d.date()}
                </button>
              );
            })}
          </div>

          {/* --- Nút đóng --- */}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs text-gray-700 dark:text-gray-200"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
