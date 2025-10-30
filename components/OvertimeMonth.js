import { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/vi";
dayjs.locale("vi");

export default function OvertimeCalendar({ overtimeData, onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(null);

  const startOfMonth = currentMonth.startOf("month");
  const endOfMonth = currentMonth.endOf("month");
  const startDay = startOfMonth.day() === 0 ? 7 : startOfMonth.day();
  const daysInMonth = endOfMonth.date();

  const prevMonth = () => setCurrentMonth(currentMonth.subtract(1, "month"));
  const nextMonth = () => setCurrentMonth(currentMonth.add(1, "month"));

  // Tạo danh sách ngày để render
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = dayjs(currentMonth).date(i);
    const otHours = overtimeData?.[date.format("YYYY-MM-DD")] || 0;
    days.push({ date, otHours });
  }

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md max-w-lg mx-auto mt-6">
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200">◀</button>
        <h2 className="text-lg font-semibold text-gray-800">
          {currentMonth.format("MMMM YYYY")}
        </h2>
        <button onClick={nextMonth} className="px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200">▶</button>
      </div>

      {/* Lưới ngày */}
      <div className="grid grid-cols-7 text-center text-sm font-medium mb-2 text-gray-500">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {Array.from({ length: startDay - 1 }).map((_, i) => <div key={`e-${i}`} />)}

        {days.map(({ date, otHours }) => {
          const isSelected = selectedDate?.isSame(date, "day");
          return (
            <div
              key={date}
              onClick={() => {
                setSelectedDate(date);
                onDateSelect && onDateSelect(date);
              }}
              className={`relative p-2 rounded-xl border cursor-pointer transition-all 
                ${isSelected ? "border-blue-600 bg-blue-100" : "border-gray-200 hover:bg-blue-50"}
              `}
            >
              <div className="font-semibold text-gray-700">{date.date()}</div>
              {otHours > 0 && (
                <div className="text-xs text-blue-600 font-bold mt-1">
                  +{otHours}h
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
