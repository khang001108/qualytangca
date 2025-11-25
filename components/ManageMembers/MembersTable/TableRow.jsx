import React from "react";
import dayjs from "dayjs";
import { Moon, SunMedium } from "lucide-react";
import { db } from "../../../lib/firebase";
import {
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";

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

  // ===========================
  // XÁC ĐỊNH NGÀY
  // ===========================
  const currentDate = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  // ===========================
  // LOAD CA THỰC TẾ
  // ===========================
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

  // ===========================
  // OVERTIME
  // ===========================
  const limit = m.overtimeLimit?.monthlyLimit || 0;
  const worked = m.overtimeLimit?.workedHours || 0;
  const remainingHours = (m.overtimeLimit?.monthlyLimit || 0) - (m.overtimeLimit?.workedHours || 0);

  // ===========================
  // LÊN CA SỚM
  // ===========================
  const handleEarlyShiftToggle = async (checked) => {
    try {
      const isNight = (shiftName || "").toLowerCase().includes("đêm");
      const dateStr = currentDate;

      // ƯU TIÊN LẤY DỮ LIỆU HIỆN CÓ TRONG shiftSchedules (đúng nhất)
      const sched = shiftSchedules[dateStr]?.[m.id] || {};

      const newShiftStart = checked
        ? isNight
          ? "lên_ca_đêm_sớm"
          : "lên_ca_ngày_sớm"
        : isNight
          ? "lên_ca_đêm_muộn"
          : "lên_ca_ngày_muộn";

      let fields = {};
      let clearFields = {};

      if (checked) {
        // Lên ca sớm → dùng giờ từ shiftSchedules nếu có, fallback config
        fields = {
          lenCaSomBatDau:
            sched.lenCaSomBatDau || shiftConfig?.day?.lenCaSomBatDau,
          lenCaSomKetThuc:
            sched.lenCaSomKetThuc || shiftConfig?.day?.lenCaSomKetThuc,
        };

        clearFields = {
          lenCaMuonBatDau: deleteField(),
          lenCaMuonKetThuc: deleteField(),
        };
      } else {
        // Lên ca muộn → dùng giờ từ shiftSchedules nếu có, fallback config
        fields = {
          lenCaMuonBatDau:
            sched.lenCaMuonBatDau || shiftConfig?.day?.lenCaMuonBatDau,
          lenCaMuonKetThuc:
            sched.lenCaMuonKetThuc || shiftConfig?.day?.lenCaMuonKetThuc,
        };

        clearFields = {
          lenCaSomBatDau: deleteField(),
          lenCaSomKetThuc: deleteField(),
        };
      }

      // Update UI
      setMembers((prev) =>
        prev.map((mem) =>
          mem.id === m.id
            ? { ...mem, earlyShift: checked, shiftStart: newShiftStart }
            : mem
        )
      );

      // Update shiftSchedules
      await setDoc(
        doc(db, "shiftSchedules", `${dateStr}__${m.id}`),
        {
          shift: shiftName,
          shiftStart: newShiftStart,
          ...fields,
          ...clearFields,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("❌ Firestore error:", err);
      alert("Không thể cập nhật Firestore.");
    }
  };

  // ===========================
  // UPDATE NGÀY NGHỈ
  // ===========================
  const handleRestDayChange = async (value) => {
    try {
      setMembers((prev) =>
        prev.map((mem) => (mem.id === m.id ? { ...mem, restDay: value } : mem))
      );

      await updateDoc(doc(db, "members", m.id), {
        restDay: value,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("❌ Lỗi cập nhật restDay:", err);
    }
  };

  // ===========================
  // TÍNH NGÀY CÒN LẠI
  // ===========================
  const getRemainingDays = () => {
    const hoursPerDay =
      shiftConfig?.day?.perDay || 2;   // số giờ tăng ca mỗi ngày

    const remainingHours =
      (m.overtimeLimit?.monthlyLimit || 0) -
      (m.overtimeLimit?.workedHours || 0);

    if (remainingHours <= 0) return 0;

    return Math.ceil(remainingHours / hoursPerDay);
  };


  // ===========================
  // RENDER
  // ===========================
  return (
    <tr className="hover:bg-purple-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-300 dark:border-gray-700">
      <td className="p-2 font-medium">{index + 1}</td>
      <td className="p-2">{m.realName}</td>
      <td className="p-2">{m.nickname}</td>

      <td className="p-2">
        {isNightShift ? (
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

      <td className="p-2">
        <select
          value={m.restDay || "Không"}
          onChange={(e) => handleRestDayChange(e.target.value)}
          className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 border"
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
        {(() => {
          let endTime = null;

          // Lấy từ shiftSchedules theo memberId (đúng)
          const sched = shiftSchedules[currentDate]?.[m.id];
          if (sched) {
            endTime = isEarly ? sched.lenCaSomKetThuc : sched.lenCaMuonKetThuc;
          }

          // Fallback config
          if (!endTime) {
            endTime = isEarly ? cfg?.lenCaSomKetThuc : cfg?.lenCaMuonKetThuc;
          }

          return endTime || "--:--";
        })()}
      </td>

      <td className="p-2 text-green-600 font-semibold">{fmt(limit)}</td>
      <td className="p-2 text-yellow-600 font-semibold">{fmt(worked)}</td>
      <td className="p-2 text-indigo-700 font-semibold">
        {fmt(remainingHours)}
      </td>
      <td className="p-2 text-orange-500 font-semibold">
        {getRemainingDays()}
      </td>

      <td className="p-2">
        <input
          type="checkbox"
          checked={isEarly}
          onChange={(e) => handleEarlyShiftToggle(e.target.checked)}
        />
      </td>
    </tr>
  );
}
