import React from "react";
import dayjs from "dayjs";
import { Moon, SunMedium } from "lucide-react";
import { db } from "../../../lib/firebase";
import { doc, updateDoc, setDoc, serverTimestamp, deleteField } from "firebase/firestore";

export default function TableRow({ index, m, setMembers, user, selectedDate, shiftSchedules, shiftConfig }) {
  const currentDate = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");

  let shiftName = m.shift;
  let shiftStart = m.shiftStart;
  const sched = shiftSchedules[currentDate]?.[m.id];
  if (sched) { shiftName = sched.shift; shiftStart = sched.shiftStart; }
  shiftStart = shiftStart || m.shiftStart || "08:00";

  const isEarly = shiftStart?.includes("sớm");
  const isNight = (shiftName || "").toLowerCase().includes("đêm");
  const cfg = isNight ? shiftConfig?.night : shiftConfig?.day;

  const limit   = Number(m.overtimeLimit?.monthlyLimit || 0);
  const worked  = Number(m.overtimeLimit?.workedHours  || 0);
  const remain  = Math.max(limit - worked, 0);

  let inTime = null;
  if (sched) inTime = isEarly ? sched.lenCaSomKetThuc : sched.lenCaMuonKetThuc;
  if (!inTime) inTime = isEarly ? cfg?.lenCaSomKetThuc : cfg?.lenCaMuonKetThuc;

  const handleRestDay = async (v) => {
    setMembers(p => p.map(x => x.id === m.id ? { ...x, restDay: v } : x));
    await updateDoc(doc(db, "members", m.id), { restDay: v, updatedAt: serverTimestamp() }).catch(console.error);
  };

  const handleEarly = async (checked) => {
    const newStart = checked ? (isNight ? "lên_ca_đêm_sớm" : "lên_ca_ngày_sớm") : (isNight ? "lên_ca_đêm_muộn" : "lên_ca_ngày_muộn");
    const sc = shiftSchedules[currentDate]?.[m.id] || {};
    const fields = checked
      ? { lenCaSomBatDau: sc.lenCaSomBatDau || cfg?.lenCaSomBatDau, lenCaSomKetThuc: sc.lenCaSomKetThuc || cfg?.lenCaSomKetThuc }
      : { lenCaMuonBatDau: sc.lenCaMuonBatDau || cfg?.lenCaMuonBatDau, lenCaMuonKetThuc: sc.lenCaMuonKetThuc || cfg?.lenCaMuonKetThuc };
    const clear = checked
      ? { lenCaMuonBatDau: deleteField(), lenCaMuonKetThuc: deleteField() }
      : { lenCaSomBatDau: deleteField(), lenCaSomKetThuc: deleteField() };
    setMembers(p => p.map(x => x.id === m.id ? { ...x, earlyShift: checked, shiftStart: newStart } : x));
    await setDoc(doc(db, "shiftSchedules", `${currentDate}__${m.id}`), { shift: shiftName, shiftStart: newStart, ...fields, ...clear, updatedAt: serverTimestamp() }, { merge: true }).catch(console.error);
  };

  const td = "px-1.5 py-2 text-center text-[11px]";

  return (
    <tr className="border-t border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <td className={`${td} text-gray-400 dark:text-gray-500 font-medium`}>{index + 1}</td>

      {/* Tên gộp 2 dòng */}
      <td className="px-2 py-1.5 text-left">
        <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 leading-tight truncate max-w-[80px]">{m.realName}</p>
        {m.nickname && <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight truncate max-w-[80px]">{m.nickname}</p>}
      </td>

      {/* Ca */}
      <td className={td}>
        {isNight
          ? <Moon className="w-3.5 h-3.5 text-indigo-400 mx-auto" />
          : <SunMedium className="w-3.5 h-3.5 text-yellow-500 mx-auto" />}
      </td>

      {/* Nghỉ */}
      <td className={td}>
        <select
          value={m.restDay || "Không"}
          onChange={e => handleRestDay(e.target.value)}
          className="text-[10px] bg-gray-100 dark:bg-gray-700 border-0 rounded px-1 py-0.5 max-w-[60px] cursor-pointer outline-none"
        >
          {["Không","T2","T3","T4","T5","T6","T7","CN"].map((v, i) => (
            <option key={v} value={["Không","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"][i]}>{v}</option>
          ))}
        </select>
      </td>

      {/* Giờ lên ca */}
      <td className={`${td} font-mono text-gray-600 dark:text-gray-300`}>{inTime ?? "--"}</td>

      {/* Giới hạn */}
      <td className={`${td} font-bold text-green-600 dark:text-green-400`}>{limit}h</td>

      {/* Đã tăng */}
      <td className={`${td} font-bold text-yellow-600 dark:text-yellow-400`}>{worked}h</td>

      {/* Còn */}
      <td className={`${td} font-bold ${remain === 0 ? "text-red-500" : "text-indigo-500 dark:text-indigo-400"}`}>{remain}h</td>

      {/* Lên sớm checkbox */}
      <td className={td}>
        <input
          type="checkbox"
          checked={isEarly}
          onChange={e => handleEarly(e.target.checked)}
          className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
        />
      </td>
    </tr>
  );
}
