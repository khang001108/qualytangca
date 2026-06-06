// MobileCard.jsx — hiển thị 1 nhân viên dạng card cho mobile
import React from "react";
import dayjs from "dayjs";
import { Moon, SunMedium, BedDouble } from "lucide-react";
import { db } from "../../../lib/firebase";
import { doc, updateDoc, setDoc, serverTimestamp, deleteField } from "firebase/firestore";

export default function MobileCard({ index, m, setMembers, user, selectedDate, shiftSchedules, shiftConfig }) {
  const fmt = (n) => `${Number(n || 0).toLocaleString()}h`;
  const currentDate = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");

  let shiftName = m.shift;
  let shiftStart = m.shiftStart;
  if (shiftSchedules[currentDate]?.[m.id]) {
    const item = shiftSchedules[currentDate][m.id];
    shiftName = item.shift;
    shiftStart = item.shiftStart;
  }
  shiftStart = shiftStart || m.shiftStart || "08:00";
  const isEarly = shiftStart.includes("sớm");
  const isNightShift = (shiftName || "").toLowerCase().includes("đêm");
  const cfg = isNightShift ? shiftConfig?.night : shiftConfig?.day;

  const limit = m.overtimeLimit?.monthlyLimit || 0;
  const worked = m.overtimeLimit?.workedHours || 0;
  const remaining = Math.max(limit - worked, 0);
  const pct = limit > 0 ? Math.min((worked / limit) * 100, 100) : 0;

  const sched = shiftSchedules[currentDate]?.[m.id];
  let endTime = null;
  if (sched) endTime = isEarly ? sched.lenCaSomKetThuc : sched.lenCaMuonKetThuc;
  if (!endTime) endTime = isEarly ? cfg?.lenCaSomKetThuc : cfg?.lenCaMuonKetThuc;

  const handleRestDayChange = async (value) => {
    setMembers(prev => prev.map(mem => mem.id === m.id ? { ...mem, restDay: value } : mem));
    await updateDoc(doc(db, "members", m.id), { restDay: value, updatedAt: serverTimestamp() }).catch(console.error);
  };

  const handleEarlyToggle = async (checked) => {
    const isNight = (shiftName || "").toLowerCase().includes("đêm");
    const newShiftStart = checked ? (isNight ? "lên_ca_đêm_sớm" : "lên_ca_ngày_sớm") : (isNight ? "lên_ca_đêm_muộn" : "lên_ca_ngày_muộn");
    const fields = checked
      ? { lenCaSomBatDau: sched?.lenCaSomBatDau || shiftConfig?.day?.lenCaSomBatDau, lenCaSomKetThuc: sched?.lenCaSomKetThuc || shiftConfig?.day?.lenCaSomKetThuc }
      : { lenCaMuonBatDau: sched?.lenCaMuonBatDau || shiftConfig?.day?.lenCaMuonBatDau, lenCaMuonKetThuc: sched?.lenCaMuonKetThuc || shiftConfig?.day?.lenCaMuonKetThuc };
    const clearFields = checked ? { lenCaMuonBatDau: deleteField(), lenCaMuonKetThuc: deleteField() } : { lenCaSomBatDau: deleteField(), lenCaSomKetThuc: deleteField() };
    setMembers(prev => prev.map(mem => mem.id === m.id ? { ...mem, earlyShift: checked, shiftStart: newShiftStart } : mem));
    await setDoc(doc(db, "shiftSchedules", `${currentDate}__${m.id}`), { shift: shiftName, shiftStart: newShiftStart, ...fields, ...clearFields, updatedAt: serverTimestamp() }, { merge: true }).catch(console.error);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-sm">
      {/* Row 1: STT + Tên + Ca */}
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 w-5 text-center shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{m.realName}</p>
          {m.nickname && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{m.nickname}</p>}
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${isNightShift ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"}`}>
          {isNightShift ? <Moon className="w-3 h-3" /> : <SunMedium className="w-3 h-3" />}
          {isNightShift ? "Đêm" : "Ngày"}
        </div>
      </div>

      {/* Row 2: giờ OT */}
      <div className="grid grid-cols-3 gap-1.5 mb-2 text-center">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg py-1.5">
          <p className="text-[9px] text-gray-400 dark:text-gray-500">Giới hạn</p>
          <p className="text-xs font-bold text-green-600 dark:text-green-400">{fmt(limit)}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg py-1.5">
          <p className="text-[9px] text-gray-400 dark:text-gray-500">Đã tăng</p>
          <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{fmt(worked)}</p>
        </div>
        <div className={`rounded-lg py-1.5 ${remaining === 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-indigo-50 dark:bg-indigo-900/20"}`}>
          <p className="text-[9px] text-gray-400 dark:text-gray-500">Còn lại</p>
          <p className={`text-xs font-bold ${remaining === 0 ? "text-red-500" : "text-indigo-600 dark:text-indigo-400"}`}>{fmt(remaining)}</p>
        </div>
      </div>

      {/* Progress bar */}
      {limit > 0 && (
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#6366f1" }} />
        </div>
      )}

      {/* Row 3: Lên ca + Nghỉ + Sớm/Muộn */}
      <div className="flex items-center gap-2 flex-wrap">
        {endTime && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
            Lên ca: {endTime}
          </span>
        )}
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <BedDouble className="w-3 h-3 text-pink-400" />
          <select
            value={m.restDay || "Không"}
            onChange={(e) => handleRestDayChange(e.target.value)}
            className="text-[10px] bg-transparent border-0 outline-none cursor-pointer text-gray-600 dark:text-gray-300"
          >
            {["Không","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 cursor-pointer ml-auto">
          <input type="checkbox" checked={isEarly} onChange={e => handleEarlyToggle(e.target.checked)} className="w-3 h-3 accent-indigo-500" />
          Lên sớm
        </label>
      </div>
    </div>
  );
}
