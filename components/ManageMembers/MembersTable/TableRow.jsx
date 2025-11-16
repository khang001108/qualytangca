import React from "react";
import dayjs from "dayjs";
import { Moon, SunMedium } from "lucide-react";
import { db } from "../../../lib/firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function TableRow({
  index,
  m,
  setMembers,
  user,
  selectedDate,
  shiftSchedules,
  overtimeDates,
  shiftConfig,
}) {
  const fmt = (n) => `${Number(n || 0).toLocaleString()}h`;

  // --------------------------
  // Xác định ngày hiện tại
  // --------------------------
  const currentDate = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  // --------------------------
  // Nghỉ luân phiên
  // --------------------------
  const weekday = dayjs(currentDate).day();
  const restDay = m.restDay || "Không";

  // --------------------------
  // Load ca làm thực tế theo shiftSchedules
  // --------------------------
  let shiftName = m.shift;
  let shiftStart = m.shiftStart;

  if (shiftSchedules[currentDate]) {
    const dateData = shiftSchedules[currentDate];
    const todayShift = Object.values(dateData).find((s) => s.memberId === m.id);

    if (todayShift) {
      shiftName = todayShift.shift;
      shiftStart = todayShift.shiftStart;
    } else if (dateData[m.realName]) {
      shiftName = dateData[m.realName].shift;
      shiftStart = dateData[m.realName].shiftStart;
    }
  }

  shiftStart = shiftStart || m.shiftStart || "08:00";

  // Xác định ca ngày / đêm
  const isNight = (shiftName || "").toLowerCase().includes("đêm");
  const cfg = isNight ? shiftConfig?.night : shiftConfig?.day;

  // check lỗi in console
  // console.log("shiftName:", shiftName);
  // console.log("isNight:", isNight);
  // console.log("shiftConfig:", shiftConfig);
  // console.log("cfg:", cfg);

  // --------------------------
  // Overtime
  // --------------------------
  const limit = m.overtimeLimit?.monthlyLimit || 0;
  const worked = m.overtimeLimit?.workedHours || 0;
  const total = limit + worked;

  const dateDisplay =
    overtimeDates[m.id] || m.overtimeLimit?.lastOvertimeDate || "-";

  // --------------------------
  // Toggle lên ca sớm
  // --------------------------
  const handleEarlyShiftToggle = async (checked) => {
    try {
      const isNight = (shiftName || "").toLowerCase().includes("đêm");
      const newShiftStart = checked
        ? isNight
          ? "19:00"
          : "07:00"
        : isNight
        ? "20:00"
        : "08:00";

      const today = dayjs().format("YYYY-MM-DD");
      const dateStr = currentDate;

      // update local UI
      setMembers((prev) =>
        prev.map((mem) =>
          mem.id === m.id
            ? {
                ...mem,
                earlyShift: checked,
                shiftStart: newShiftStart,
                shift: shiftName,
                updatedDate: today,
              }
            : mem
        )
      );

      // update Firestore: members
      const memberRef = doc(db, "members", m.id);
      await updateDoc(memberRef, {
        earlyShift: checked,
        shiftStart: newShiftStart,
        shift: shiftName,
        updatedDate: today,
        updatedAt: serverTimestamp(),
      });

      // update Firestore: shiftSchedules
      const safeName = m.realName.replace(/[\/\\.#$[\]]/g, "_");
      const docId = `${user.uid}_${safeName}_${dateStr}`;
      const shiftDoc = doc(db, "shiftSchedules", docId);

      await setDoc(shiftDoc, {
        userId: user.uid,
        memberId: m.id,
        realName: m.realName,
        shift: shiftName,
        shiftStart: newShiftStart,
        date: dateStr,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("❌ Lỗi cập nhật Firestore:", err);
      alert("Không thể cập nhật Firestore.");
    }
  };

  // --------------------------
  // Cập nhật ngày nghỉ luân phiên
  // --------------------------
  const handleRestDayChange = async (value) => {
    try {
      // Update UI local
      setMembers((prev) =>
        prev.map((mem) => (mem.id === m.id ? { ...mem, restDay: value } : mem))
      );

      // Update Firestore
      const ref = doc(db, "members", m.id);
      await updateDoc(ref, {
        restDay: value,
        updatedAt: serverTimestamp(),
      });

      console.log(`✔ Cập nhật ngày nghỉ của ${m.realName}: ${value}`);
    } catch (err) {
      console.error("❌ Lỗi lưu ngày nghỉ:", err);
      alert("Không thể lưu ngày nghỉ luân phiên.");
    }
  };

  // =========================
  // TÍNH SỐ NGÀY CÒN LẠI
  // =========================
  const getRemainingDays = () => {
    const limitDoc = m.limitInfo;
  
    if (limitDoc?.days) return limitDoc.days;
  
    const memberLimit = m.overtimeLimit?.monthlyLimit || 0;
    const worked = m.overtimeLimit?.workedHours || 0;
    const remaining = Math.max(memberLimit - worked, 0);
  
    const perDay = shiftConfig?.day?.perDay || 2;
    return Math.floor(remaining / perDay);
  };
  

  // --------------------------
  // Render
  // --------------------------
  return (
    <tr
      className="
        hover:bg-purple-100 dark:hover:bg-gray-800 
        transition-colors border-t 
        border-gray-300 dark:border-gray-700
      "
    >
      <td className="p-2 font-medium">{index + 1}</td>

      <td className="p-2">{m.realName}</td>

      <td className="p-2">{m.nickname}</td>

      {/* Ca ngày / đêm */}
      <td className="p-2">
        {shiftName?.toLowerCase().includes("đêm") ? (
          <div className="flex items-center justify-center gap-1">
            <Moon className="w-4 h-4 text-blue-500" />
            <span>Đêm</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <SunMedium className="w-4 h-4 text-yellow-500" />
            <span>Ngày</span>
          </div>
        )}
      </td>

      {/* ngày luân phiên */}
      <td className="p-2">
        <select
          value={m.restDay || "Không"}
          onChange={(e) => handleRestDayChange(e.target.value)}
          className="
      px-2 py-1 rounded-lg text-sm
      bg-gray-200 dark:bg-gray-700
      text-gray-900 dark:text-gray-100
      border border-gray-300 dark:border-gray-600
      focus:ring-2 focus:ring-purple-500
    "
        >
          <option value="Không">Không</option>
          <option value="Thứ 2">Thứ 2</option>
          <option value="Thứ 3">Thứ 3</option>
          <option value="Thứ 4">Thứ 4</option>
          <option value="Thứ 5">Thứ 5</option>
          <option value="Thứ 6">Thứ 6</option>
          <option value="Thứ 7">Thứ 7</option>
          <option value="Chủ nhật">Chủ nhật</option>
        </select>
      </td>

      <td className="p-2">
        {m.earlyShift
          ? cfg?.lenCaSomKetThuc || "--:--"
          : cfg?.lenCaMuonKetThuc || "--:--"}
      </td>

      <td className="p-2 text-green-600 dark:text-green-400 font-semibold">
        {fmt(limit)}
      </td>

      <td className="p-2 text-yellow-600 dark:text-yellow-400 font-semibold">
        {fmt(worked)}
      </td>

      <td className="p-2 text-indigo-700 dark:text-indigo-400 font-semibold">
        {fmt(total)}
      </td>

      <td className="p-2 text-orange-500 font-semibold">
        {getRemainingDays()}
      </td>

      {/* Checkbox lên ca sớm */}
      <td className="p-2">
        <input
          type="checkbox"
          checked={m.earlyShift || false}
          onChange={(e) => handleEarlyShiftToggle(e.target.checked)}
        />
      </td>
    </tr>
  );
}
