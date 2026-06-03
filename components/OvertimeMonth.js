// components/OvertimeMonth.js — Calendar picker, mobile-friendly
import { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const DAY_HEADERS = ["T2","T3","T4","T5","T6","T7","CN"];

export default function OvertimeMonth({
  selectedMonth, setSelectedMonth,
  selectedYear,  setSelectedYear,
  selectedDate,  setSelectedDate,
  onDateSelect,
  shiftSchedules = {},
}) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef();
  const today             = dayjs();

  const startOfMonth = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-01`);
  const daysInMonth  = startOfMonth.daysInMonth();
  const startIndex   = startOfMonth.day() === 0 ? 6 : startOfMonth.day() - 1; // Mon-based

  const days = Array.from({ length: daysInMonth }, (_, i) =>
    startOfMonth.add(i, "day")
  );

  // Close on outside click / ESC
  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === "Escape") setOpen(false); };
    if (open) {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown",   onKey);
    }
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
  };

  const handleSelect = (d) => {
    const date = d.toDate();
    setSelectedDate?.(date);
    setSelectedMonth?.(d.month() + 1);
    setSelectedYear?.(d.year());
    onDateSelect?.(d);
    setOpen(false);
  };

  // Summary for the row above the calendar button
  const totalStaffToday = selectedDate
    ? Object.keys(shiftSchedules[dayjs(selectedDate).format("YYYY-MM-DD")] || {}).length
    : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Selected date display */}
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <CalendarDays className="w-4 h-4 text-indigo-500" />
          <span>
            Ngày chọn:{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedDate ? dayjs(selectedDate).format("DD/MM/YYYY") : "—"}
            </span>
          </span>
          {totalStaffToday > 0 && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 rounded-full px-2 py-0.5">
              {totalStaffToday} NV có ca
            </span>
          )}
        </div>

        {/* Month nav + calendar button */}
        <div ref={ref} className="relative flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setOpen((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition select-none"
          >
            📅 {selectedMonth}/{selectedYear}
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Dropdown calendar */}
          {open && (
            <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-3 w-72 animate-popIn">
              {/* Header */}
              <div className="flex items-center justify-between mb-2 text-sm">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  Tháng {selectedMonth}/{selectedYear}
                </span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {DAY_HEADERS.map((d) => (
                  <div key={d} className="font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
                ))}
                {Array.from({ length: startIndex }).map((_, i) => (
                  <div key={"e"+i} />
                ))}
                {days.map((d) => {
                  const ds       = d.format("YYYY-MM-DD");
                  const isToday  = ds === today.format("YYYY-MM-DD");
                  const isSel    = selectedDate && dayjs(selectedDate).format("YYYY-MM-DD") === ds;
                  const shiftMap = shiftSchedules[ds] || {};
                  const nightCnt = Object.values(shiftMap).filter((s) => s.shift?.toLowerCase().includes("đêm")).length;
                  const dayCnt   = Object.keys(shiftMap).length - nightCnt;
                  const hasCa    = nightCnt > 0 || dayCnt > 0;

                  return (
                    <button
                      key={ds}
                      onClick={() => handleSelect(d)}
                      className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition select-none
                        ${isSel ? "bg-indigo-500 text-white font-bold"
                          : isToday ? "bg-orange-100 dark:bg-orange-800/50 text-orange-600 dark:text-orange-300 font-semibold border border-orange-300 dark:border-orange-600"
                          : nightCnt > 0 ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                          : dayCnt  > 0 ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                      {d.date()}
                      {hasCa && !isSel && (
                        <span className={`w-1 h-1 rounded-full mt-0.5 ${nightCnt > 0 ? "bg-indigo-400" : "bg-yellow-400"}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Ca ngày</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />Ca đêm</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-300 inline-block" />Hôm nay</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
