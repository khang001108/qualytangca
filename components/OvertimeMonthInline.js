// components/OvertimeMonthInline.js — Lịch inline mobile
import React from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";

const AVATAR_COLORS = ["#f59e0b","#6366f1","#10b981","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];
function nameToColor(name) {
  let h = 0;
  for (let i = 0; i < (name||"").length; i++) h = (h * 31 + (name.charCodeAt(i))) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function toHHMM(minutes) {
  if (minutes == null || isNaN(minutes)) return "--:--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function OvertimeMonthInline({
  selectedMonth, setSelectedMonth,
  selectedYear, setSelectedYear,
  selectedDate, setSelectedDate,
  onDateSelect,
  shiftSchedules = {},
}) {
  const today = dayjs();
  const daysInMonth = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-01`).daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) =>
    dayjs(`${selectedYear}-${String(selectedMonth).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`)
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

  const selectedKey = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : null;
  const selectedShifts = selectedKey ? shiftSchedules[selectedKey] || {} : {};
  const allWorkers = Object.values(selectedShifts);
  const dayWorkers = allWorkers.filter(s => !s.shift?.toLowerCase().includes("đêm"));
  const nightWorkers = allWorkers.filter(s => s.shift?.toLowerCase().includes("đêm"));

  return (
    <div className="card animate-fade-in-up space-y-4">
      {/* Header tháng/năm */}
      <div className="flex items-center justify-between px-1 max-w-sm mx-auto w-full">
        <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">Tháng {selectedMonth}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{selectedYear}</p>
        </div>
        <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300 transition">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Lịch */}
      <div className="w-full">
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {["T2","T3","T4","T5","T6","T7","CN"].map(d => (
          <div key={d} className="py-1.5 font-semibold text-gray-400 dark:text-gray-500 text-[10px]">{d}</div>
        ))}
        {Array.from({ length: startIndex }).map((_, i) => <div key={"e"+i} />)}
        {days.map(d => {
          const dateStr = d.format("YYYY-MM-DD");
          const isToday = dateStr === today.format("YYYY-MM-DD");
          const isSelected = selectedKey === dateStr;
          const shiftMap = shiftSchedules[dateStr] || {};
          const vals = Object.values(shiftMap);
          const counts = { day: 0, night: 0 };
          let hasLenCa = false, hasXuongCa = false;
          vals.forEach(s => {
            if (s.shift?.toLowerCase().includes("đêm")) counts.night++;
            else counts.day++;
            if (s.lenCa) hasLenCa = true;
            if (s.xuongCa) hasXuongCa = true;
          });
          const hasBoth = counts.day > 0 && counts.night > 0;
          const hasNight = counts.night > 0 && counts.day === 0;
          const hasDay = counts.day > 0 && counts.night === 0;
          const hasAny = counts.day > 0 || counts.night > 0;

          let cellClass = "relative rounded-lg h-9 flex flex-col items-center justify-center transition-all cursor-pointer font-medium select-none text-[12px] ";
          if (isSelected) cellClass += "bg-indigo-500 text-white shadow-md ring-2 ring-indigo-400 ";
          else if (isToday) cellClass += "bg-orange-400 text-white font-bold ";
          else if (hasBoth) cellClass += "bg-gradient-to-br from-yellow-100 to-indigo-100 dark:from-yellow-900/40 dark:to-indigo-900/40 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 ";
          else if (hasNight) cellClass += "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 ";
          else if (hasDay) cellClass += "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700 ";
          else cellClass += "bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 border border-gray-100 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60 ";

          return (
            <button key={dateStr} onClick={() => handleSelectDate(dateStr)} className={cellClass}>
              <span className="leading-none">{d.date()}</span>
              {/* Dot indicators: xanh=lên ca, đỏ=xuống ca, vàng=có data nhưng chưa đủ */}
              {hasAny && !isSelected && !isToday && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {hasLenCa && (
                    <span className="w-1 h-1 rounded-full bg-green-500 inline-block" title="Có lên ca" />
                  )}
                  {hasXuongCa && (
                    <span className="w-1 h-1 rounded-full bg-blue-400 inline-block" title="Có xuống ca" />
                  )}
                  {!hasLenCa && !hasXuongCa && (
                    <span className="w-1 h-1 rounded-full bg-orange-400 inline-block" title="Có lịch, chưa chấm" />
                  )}
                </div>
              )}
            </button>
          );
        })}\n      </div>
      </div>

      {/* Chú thích */}
      <div className="flex items-center gap-3 justify-center text-[10px] text-gray-500 dark:text-gray-400 pt-1.5 flex-wrap border-t border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Lên ca</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Xuống ca</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>Chưa chấm</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 inline-block"/>Ca ngày</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 inline-block"/>Ca đêm</span>
      </div>

      {/* Chi tiết ngày được chọn */}
      {selectedKey && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-base">📅</span>
            <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">
              {dayjs(selectedDate).format("DD/MM/YYYY")}
            </span>
            <span className="ml-auto text-xs text-gray-400">{allWorkers.length} người</span>
          </div>

          {allWorkers.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center text-xs text-gray-400 dark:text-gray-500">
              Chưa có dữ liệu ca ngày này
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-3 border border-yellow-100 dark:border-yellow-900/30">
              <div className="space-y-1.5">
                {allWorkers.map((s, i) => {
                  const isNight = s.shift?.toLowerCase().includes("đêm");
                  const isEarly = s.shiftStart?.includes("sớm");
                  const ot = Number(s.tangCaHomNay || 0);
                  const avatarColor = nameToColor(s.realName);
                  return (
                    <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-2.5 py-2 border border-yellow-100 dark:border-gray-700">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: avatarColor + "25" }}>
                        <User className="w-3 h-3" style={{ color: avatarColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{s.realName || "—"}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{isNight ? "🌙 Ca đêm" : "☀ Ca ngày"}</p>
                      </div>
                      {ot > 0 && (
                        <span className="text-[10px] font-bold text-orange-500 shrink-0">+{ot}h TC</span>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        isEarly
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}>
                        {isEarly ? "Sớm" : "Muộn"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
