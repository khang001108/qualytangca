import React from "react";

export default function NoLimitView({ shiftConfig, defaultDailyCap }) {
  const formatHour = (hour) => {
    if (hour == null || isNaN(hour)) return "--:--";
    const totalMinutes = Math.round(hour * 60);
    const h = Math.floor((totalMinutes / 60) % 24);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const totalMaxHours = daysInMonth * defaultDailyCap;

  const dayShifts = [
    { label: "Tan ca sớm", time: formatHour(shiftConfig.earlyEndTo) },
    { label: "Tan ca muộn", time: formatHour(shiftConfig.lateEndTo) },
  ];

  const nightShifts = [
    { label: "Tan ca sớm (đêm)", time: formatHour(shiftConfig.earlyEndToNight) },
    { label: "Tan ca muộn (đêm)", time: formatHour(shiftConfig.lateEndToNight) },
  ];

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-4 space-y-5 shadow-sm">
      <div>
        <div className="text-amber-500 font-semibold mb-2">Ca ngày</div>
        <div className="flex flex-wrap gap-2">
          {dayShifts.map((s, i) => (
            <button key={i} className="px-3 py-2 rounded-lg border text-sm w-full sm:w-auto">
              {s.label}:{" "}
              <span className="text-indigo-500 font-semibold">{s.time}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-amber-500 font-semibold mb-2">Ca đêm</div>
        <div className="flex flex-wrap gap-2">
          {nightShifts.map((s, i) => (
            <button key={i} className="px-3 py-2 rounded-lg border text-sm w-full sm:w-auto">
              {s.label}:{" "}
              <span className="text-indigo-500 font-semibold">{s.time}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">Giới hạn/ngày</div>
            <div className="text-lg font-semibold text-indigo-500">
              ≤ {defaultDailyCap} h
            </div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">Số ngày trong tháng</div>
            <div className="text-lg font-semibold">{daysInMonth} ngày</div>
          </div>
          <div className="border rounded-lg p-3 col-span-2 sm:col-span-1">
            <div className="text-xs text-gray-500">Tổng giờ tối đa</div>
            <div className="text-lg font-semibold text-amber-500">
              {totalMaxHours} h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
