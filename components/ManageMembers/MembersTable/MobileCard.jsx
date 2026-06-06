// MobileCard.jsx — compact single-line card cho mobile
import React from "react";
import dayjs from "dayjs";
import { Moon, SunMedium, BedDouble, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { db } from "../../../lib/firebase";
import { doc, updateDoc, setDoc, serverTimestamp, deleteField } from "firebase/firestore";

export default function MobileCard({ index, m, setMembers, user, selectedDate, shiftSchedules, shiftConfig }) {
  const [expanded, setExpanded] = useState(false);
  const currentDate = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");

  let shiftName = m.shift;
  let shiftStart = m.shiftStart;
  const schedEntry = shiftSchedules[currentDate]?.[m.id];
  if (schedEntry) { shiftName = schedEntry.shift; shiftStart = schedEntry.shiftStart; }
  shiftStart = shiftStart || m.shiftStart || "08:00";
  const isEarly = shiftStart?.includes("sớm");
  const isNight = (shiftName || "").toLowerCase().includes("đêm");

  const limit  = Number(m.overtimeLimit?.monthlyLimit || 0);
  const worked = Number(m.overtimeLimit?.workedHours  || 0);
  const remain = Math.max(limit - worked, 0);
  const pct    = limit > 0 ? Math.min((worked / limit) * 100, 100) : 0;

  const cfg = isNight ? shiftConfig?.night : shiftConfig?.day;
  let inTime = null;
  if (schedEntry) inTime = isEarly ? schedEntry.lenCaSomKetThuc : schedEntry.lenCaMuonKetThuc;
  if (!inTime)    inTime = isEarly ? cfg?.lenCaSomKetThuc : cfg?.lenCaMuonKetThuc;

  const handleRestDay = async (v) => {
    setMembers(p => p.map(x => x.id === m.id ? { ...x, restDay: v } : x));
    await updateDoc(doc(db, "members", m.id), { restDay: v, updatedAt: serverTimestamp() }).catch(console.error);
  };

  const handleEarly = async (checked) => {
    const newStart = checked ? (isNight ? "lên_ca_đêm_sớm" : "lên_ca_ngày_sớm") : (isNight ? "lên_ca_đêm_muộn" : "lên_ca_ngày_muộn");
    const fields = checked
      ? { lenCaSomBatDau: schedEntry?.lenCaSomBatDau || cfg?.lenCaSomBatDau, lenCaSomKetThuc: schedEntry?.lenCaSomKetThuc || cfg?.lenCaSomKetThuc }
      : { lenCaMuonBatDau: schedEntry?.lenCaMuonBatDau || cfg?.lenCaMuonBatDau, lenCaMuonKetThuc: schedEntry?.lenCaMuonKetThuc || cfg?.lenCaMuonKetThuc };
    const clear = checked
      ? { lenCaMuonBatDau: deleteField(), lenCaMuonKetThuc: deleteField() }
      : { lenCaSomBatDau: deleteField(), lenCaSomKetThuc: deleteField() };
    setMembers(p => p.map(x => x.id === m.id ? { ...x, earlyShift: checked, shiftStart: newStart } : x));
    await setDoc(doc(db, "shiftSchedules", `${currentDate}__${m.id}`), { shift: shiftName, shiftStart: newStart, ...fields, ...clear, updatedAt: serverTimestamp() }, { merge: true }).catch(console.error);
  };

  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#6366f1";

  return (
    <div className={`bg-white dark:bg-gray-800/80 border rounded-xl overflow-hidden transition-all ${expanded ? "border-indigo-300 dark:border-indigo-700" : "border-gray-100 dark:border-gray-700/60"}`}>

      {/* ── Main row (always visible) ── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* STT */}
        <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 w-4 shrink-0">{index + 1}</span>

        {/* Avatar initial */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isNight ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300" : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"}`}>
          {(m.realName || "?")?.[0]}
        </div>

        {/* Tên */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{m.realName}</p>
          {m.nickname && <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate leading-tight">{m.nickname}</p>}
        </div>

        {/* Mini stats: worked / limit */}
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 leading-tight">{worked}h<span className="text-gray-300 dark:text-gray-600 font-normal">/{limit}h</span></p>
          {limit > 0 && (
            <div className="w-16 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
          )}
        </div>

        {/* Ca badge */}
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold shrink-0 ${isNight ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"}`}>
          {isNight ? <Moon className="w-2.5 h-2.5" /> : <SunMedium className="w-2.5 h-2.5" />}
          {isNight ? "Đ" : "N"}
        </div>

        {/* Expand icon */}
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700/60 px-3 py-2.5 space-y-2.5 bg-gray-50/50 dark:bg-gray-800/30">

          {/* 3 stat boxes compact */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg py-1.5">
              <p className="text-[8px] text-gray-400 leading-tight">Giới hạn</p>
              <p className="text-[11px] font-bold text-green-600 dark:text-green-400">{limit}h</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg py-1.5">
              <p className="text-[8px] text-gray-400 leading-tight">Đã tăng</p>
              <p className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400">{worked}h</p>
            </div>
            <div className={`rounded-lg py-1.5 ${remain === 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-indigo-50 dark:bg-indigo-900/20"}`}>
              <p className="text-[8px] text-gray-400 leading-tight">Còn lại</p>
              <p className={`text-[11px] font-bold ${remain === 0 ? "text-red-500" : "text-indigo-500 dark:text-indigo-400"}`}>{remain}h</p>
            </div>
          </div>

          {/* Controls: giờ lên ca + nghỉ + lên sớm */}
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-500 dark:text-gray-400">
            {inTime && (
              <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                🕐 Lên ca: <b>{inTime}</b>
              </span>
            )}

            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3 text-pink-400" />
              <select
                value={m.restDay || "Không"}
                onChange={e => handleRestDay(e.target.value)}
                className="text-[10px] bg-transparent border-0 outline-none cursor-pointer text-gray-600 dark:text-gray-300 max-w-[70px]"
                onClick={e => e.stopPropagation()}
              >
                {["Không","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </span>

            <label
              className="flex items-center gap-1 cursor-pointer ml-auto"
              onClick={e => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isEarly}
                onChange={e => handleEarly(e.target.checked)}
                className="w-3 h-3 accent-indigo-500"
              />
              Lên sớm
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
