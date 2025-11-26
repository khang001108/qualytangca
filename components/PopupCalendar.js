// components/PopupCalendar.js
// Popup hiển thị lịch tăng ca theo ngày — dùng cả overtimeItems (ưu tiên) và shiftSchedules (fallback)
// + hỗ trợ điều hướng tháng nội bộ (prev/next)

import React, { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";

export default function PopupCalendar({
  member = {},
  selectedMonth, // 1-12 (optional)
  selectedYear,  // number (optional)
  overtimeItems = [], // all overtimes for this member (recommended)
  shiftSchedules = {}, // fallback schedule map: { "YYYY-MM-DD": { ... } }
  onClose = () => {},
}) {
  // init view state from props (if provided) or today
  const initYear = Number(selectedYear) || dayjs().year();
  const initMonth = Number(selectedMonth) || (dayjs().month() + 1);
  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth); // 1..12

  // keep in sync if parent changes selectedMonth/Year
  useEffect(() => {
    if (selectedYear) setViewYear(Number(selectedYear));
  }, [selectedYear]);

  useEffect(() => {
    if (selectedMonth) setViewMonth(Number(selectedMonth));
  }, [selectedMonth]);

  // Helpers to change month
  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }
  function prevYear() {
    setViewYear((y) => y - 1);
  }
  function nextYear() {
    setViewYear((y) => y + 1);
  }

  // date calculations (viewMonth is 1..12)
  const year = Number(viewYear);
  const month = Number(viewMonth);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0..6 (Sun..Sat)
  const startIndex = firstDay === 0 ? 6 : firstDay - 1; // shift so Mon=0

  // Normalize overtime items (only once per change)
  const normalizedOvertimes = useMemo(() => {
    return (overtimeItems || []).map((o) => {
      // try various date fields & types
      let parsed;
      if (o.currentDate) {
        // Firestore Timestamp?
        if (typeof o.currentDate === "object" && typeof o.currentDate.toDate === "function") {
          parsed = dayjs(o.currentDate.toDate());
        } else {
          parsed = dayjs(o.currentDate);
        }
      } else if (o.date) {
        if (typeof o.date === "object" && typeof o.date.toDate === "function") {
          parsed = dayjs(o.date.toDate());
        } else {
          parsed = dayjs(o.date);
        }
      } else {
        parsed = dayjs.invalid();
      }

      return {
        ...o,
        _dateKey: parsed.isValid() ? parsed.format("YYYY-MM-DD") : null,
      };
    });
  }, [overtimeItems]);

  // get record for day (uses viewMonth/viewYear)
  function getRecordForDay(day) {
    const key = dayjs(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`).format("YYYY-MM-DD");

    // 1) tìm trong overtimeItems
    let record = normalizedOvertimes.find((o) => {
      if (!o._dateKey) return false;
      if (o._dateKey !== key) return false;

      // prefer match by memberId if available in both sides
      if (member?.id && o.memberId) {
        return String(o.memberId) === String(member.id);
      }
      // fallback match by realName
      if (o.realName && member?.realName) {
        return String(o.realName) === String(member.realName);
      }
      // if neither key available, accept (best-effort)
      return true;
    });

    // 2) fallback shiftSchedules
    if (!record && shiftSchedules && shiftSchedules[key]) {
      const dateData = shiftSchedules[key];
      // try keys: member.id, member.realName, or search values by memberId
      if (member?.id && dateData[member.id]) {
        const s = dateData[member.id];
        record = {
          _fromShift: true,
          tangCaHomNay: s.tangCaHomNay || 0,
          thuong: s.thuong || 0,
          lenCa: s.lenCa || "",
          xuongCa: s.xuongCa || "",
          note: s.note || "",
        };
      } else if (member?.realName && dateData[member.realName]) {
        const s = dateData[member.realName];
        record = {
          _fromShift: true,
          tangCaHomNay: s.tangCaHomNay || 0,
          thuong: s.thuong || 0,
          lenCa: s.lenCa || "",
          xuongCa: s.xuongCa || "",
          note: s.note || "",
        };
      } else {
        // search values
        const found = Object.values(dateData).find((v) => String(v.memberId) === String(member?.id));
        if (found) {
          record = {
            _fromShift: true,
            tangCaHomNay: found.tangCaHomNay || 0,
            thuong: found.thuong || 0,
            lenCa: found.lenCa || "",
            xuongCa: found.xuongCa || "",
            note: found.note || "",
          };
        }
      }
    }

    return record || null;
  }

  // tổng giờ theo viewMonth/viewYear
  const totalHours = useMemo(() => {
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const r = getRecordForDay(d);
      if (r) {
        total += Number(r.tangCaHomNay || 0) + Number(r.thuong || 0);
      }
    }
    return total;
  }, [daysInMonth, viewMonth, viewYear, normalizedOvertimes, shiftSchedules, member]);

  // render day cell
  function renderDayCell(day) {
    const record = getRecordForDay(day);
    const tang = Number(record?.tangCaHomNay || 0);
    const thuong = Number(record?.thuong || 0);
    const total = tang + thuong;

    let bg = "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500";
    if (total > 0) {
      bg = "bg-green-200 dark:bg-green-700/50 text-green-900 dark:text-green-200 font-semibold";
    } else if (record?.lenCa) {
      bg = "bg-blue-200 dark:bg-blue-700/50 text-blue-900 dark:text-blue-200 font-semibold";
    }

    const title = record
      ? `Tăng ca: ${tang || 0}h\nThưởng: ${thuong || 0}h${record?.note ? `\nGhi chú: ${record.note}` : ""}`
      : "Không có dữ liệu";

    return (
      <div
        key={`d-${day}`}
        className={`p-2 rounded-lg flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700 hover:scale-105 transition ${bg}`}
        title={title}
      >
        <span>{day}</span>
        {total > 0 && (
          <span className="text-[10px] font-semibold text-orange-600 dark:text-yellow-300">
            {Number(total).toFixed(1)}h
          </span>
        )}
      </div>
    );
  }

  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  // stop propagation so clicking inside popup won't close it
  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-2xl p-6 w-80 sm:w-96 shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeIn"
        onClick={stop}
      >
        <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3 text-center">
          📅 Lịch tăng ca - {member?.nickname || member?.realName || "Nhân viên"}
        </h2>

        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            <button onClick={prevYear} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">{"<<"}</button>
            <button onClick={prevMonth} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">{"<"}</button>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Tháng {String(month).padStart(2, "0")}/{year}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={nextMonth} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">{">"}</button>
            <button onClick={nextYear} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800">{">>"}</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-center mb-3">
          {weekdays.map((d) => (
            <div key={d} className="font-semibold text-gray-500 dark:text-gray-400 py-1">
              {d}
            </div>
          ))}

          {/* blank cells */}
          {Array.from({ length: startIndex }).map((_, i) => (
            <div key={`b-${i}`} className="p-2" />
          ))}

          {/* days */}
          {Array.from({ length: daysInMonth }, (_, i) => renderDayCell(i + 1))}
        </div>

        <div className="flex items-center justify-between text-[12px] mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-700/50 border border-gray-300" />
            <div className="text-[12px] text-gray-600 dark:text-gray-300">Có tăng ca</div>

            <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-700/50 border border-gray-300 ml-3" />
            <div className="text-[12px] text-gray-600 dark:text-gray-300">Chỉ có ca (lenCa)</div>
          </div>

          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Tổng: <span className="text-emerald-600">{Number(totalHours).toFixed(1)}h</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white py-2 rounded-xl transition"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
