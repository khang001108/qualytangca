// components/OvertimeMonthInline.js
// Lịch inline đầy đủ — dùng trên mobile tab "Lịch"

import React, { useState } from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function OvertimeMonthInline({
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  selectedDate,
  setSelectedDate,
  onDateSelect,
  shiftSchedules = {},
}) {
  const today = dayjs();

  const daysInMonth = dayjs(
    `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
  ).daysInMonth();

  const days = Array.from({ length: daysInMonth }, (_, i) =>
    dayjs(
      `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    )
  );

  const firstDay = dayjs(`${selectedYear}-${selectedMonth}-01`).day();
  const startIndex = firstDay === 0 ? 6 : firstDay - 1;

  const handleSelectDate = (dateStr) => {
    const d = dayjs(dateStr);
    setSelectedDate?.(d.toDate());
    setSelectedMonth?.(d.month() + 1);
    setSelectedYear?.(d.year());
    onDateSelect?.(d);
  };

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(selectedYear - 1); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(selectedYear + 1); }
    else setSelectedMonth(selectedMonth + 1);
  };

  // Thống kê ngày được chọn
  const selectedKey = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : null;
  const selectedShifts = selectedKey ? shiftSchedules[selectedKey] || {} : {};
  const dayWorkers = Object.values(selectedShifts).filter(s => !s.shift?.toLowerCase().includes("đêm"));
  const nightWorkers = Object.values(selectedShifts).filter(s => s.shift?.toLowerCase().includes("đêm"));

  return (
    <div className="card animate-fade-in-up space-y-4">
      {/* Header tháng/năm */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
            Tháng {selectedMonth}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{selectedYear}</p>
        </div>

        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Lịch */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <div key={d} className="py-1.5 font-semibold text-gray-400 dark:text-gray-500 text-[11px]">
            {d}
          </div>
        ))}

        {Array.from({ length: startIndex }).map((_, i) => (
          <div key={"empty-" + i} />
        ))}

        {days.map((d) => {
          const dateStr = d.format("YYYY-MM-DD");
          const isToday = dateStr === today.format("YYYY-MM-DD");
          const isSelected = selectedKey === dateStr;

          const shiftMap = shiftSchedules[dateStr] || {};
          const counts = { day: 0, night: 0 };
          Object.values(shiftMap).forEach((s) => {
            if (s.shift?.toLowerCase().includes("đêm")) counts.night++;
            else counts.day++;
          });

          const hasBoth = counts.day > 0 && counts.night > 0;
          const hasNight = counts.night > 0 && counts.day === 0;
          const hasDay = counts.day > 0 && counts.night === 0;

          let cellClass = "rounded-xl aspect-square flex flex-col items-center justify-center transition-all cursor-pointer text-[12px] font-medium select-none ";

          if (isSelected) {
            cellClass += "bg-indigo-500 text-white shadow-md scale-105 ";
          } else if (isToday) {
            cellClass += "bg-orange-400 text-white font-bold ";
          } else if (hasBoth) {
            cellClass += "bg-gradient-to-br from-yellow-100 to-indigo-100 dark:from-yellow-900/40 dark:to-indigo-900/40 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 ";
          } else if (hasNight) {
            cellClass += "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 ";
          } else if (hasDay) {
            cellClass += "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 ";
          } else {
            cellClass += "bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 ";
          }

          return (
            <button
              key={dateStr}
              onClick={() => handleSelectDate(dateStr)}
              className={cellClass}
            >
              <span>{d.date()}</span>
              {(counts.day > 0 || counts.night > 0) && !isSelected && (
                <span className="text-[8px] leading-none mt-0.5 opacity-70">
                  {counts.day > 0 && `☀${counts.day}`}{counts.night > 0 && `🌙${counts.night}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chú thích */}
      <div className="flex items-center gap-4 justify-center text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 inline-block" />
          Ca ngày
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 inline-block" />
          Ca đêm
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-400 inline-block" />
          Hôm nay
        </span>
      </div>

      {/* Chi tiết ngày được chọn */}
      {selectedKey && (
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 space-y-3">
          <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">
            📅 {dayjs(selectedDate).format("DD/MM/YYYY")}
          </p>
          {Object.keys(selectedShifts).length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">Không có dữ liệu ca</p>
          ) : (
            <div className="space-y-3">
              {[
                { workers: dayWorkers, label: "Ca ngày", icon: "☀️", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800" },
                { workers: nightWorkers, label: "Ca đêm", icon: "🌙", color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800" },
              ].map(({ workers, label, icon, color, bg }) =>
                workers.length > 0 && (
                  <div key={label} className={`rounded-xl p-2.5 ${bg}`}>
                    <p className={`text-[11px] font-bold mb-2 ${color}`}>
                      {icon} {label} ({workers.length} người)
                    </p>
                    <div className="space-y-2">
                      {workers.map((s, i) => {
                        const checkIn  = s.lastCheckInTime  || s.checkIn  || s.shiftStart || "";
                        const checkOut = s.lastCheckOutTime || s.checkOut || "";
                        const ot       = Number(s.tangCaHomNay || 0);
                        const bonus    = Number(s.thuong || 0);
                        const type     = s.type;
                        const isLeave  = type === "leave";
                        return (
                          <div key={i} className="flex items-start justify-between gap-2 text-xs">
                            {/* Tên */}
                            <span className="font-medium text-gray-800 dark:text-gray-200 min-w-0 truncate">
                              {s.realName || "—"}
                            </span>

                            {/* Giờ + thông tin */}
                            <div className="text-right shrink-0 space-y-0.5">
                              {isLeave ? (
                                <span className="text-orange-500 font-semibold">Nghỉ phép</span>
                              ) : (
                                <>
                                  {/* Giờ vào / ra */}
                                  <div className="flex items-center gap-1 justify-end">
                                    {checkIn && (
                                      <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                        ↑ {checkIn}
                                      </span>
                                    )}
                                    {checkOut && (
                                      <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono text-[10px]">
                                        ↓ {checkOut}
                                      </span>
                                    )}
                                    {!checkIn && !checkOut && (
                                      <span className="text-gray-400 dark:text-gray-500 text-[10px]">Chưa điểm danh</span>
                                    )}
                                  </div>
                                  {/* Tăng ca + thưởng */}
                                  {(ot > 0 || bonus > 0) && (
                                    <div className="flex gap-1 justify-end">
                                      {ot > 0 && (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                          +{ot}h TC
                                        </span>
                                      )}
                                      {bonus > 0 && (
                                        <span className="text-amber-600 dark:text-amber-400 font-semibold text-[10px]">
                                          🎁{bonus}h
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
