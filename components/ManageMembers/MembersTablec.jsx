// components/ManageMembers/MembersTable.jsx
// bảng thành viên trong quản lý thành viên

import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  List,
  CircleUser,
  User,
  BriefcaseBusiness,
  ClockArrowUp,
  Hourglass,
  ClockFading,
  CalendarClock,
  Timer,
  Moon,
  SunMedium,
  CalendarDays,
  BedDouble,
} from "lucide-react";
import { db } from "../../lib/firebase";
import {
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  collection,
} from "firebase/firestore";

export default function MembersTable({
  members = [],
  setMembers,
  user,
  selectedDate,
  shiftSchedules = {},
}) {
  const [overtimeDates, setOvertimeDates] = useState({});
  const fmt = (n) => `${Number(n || 0).toLocaleString()}h`;

  // === Lấy dữ liệu ngày tăng ca từ overtimeLimits ===
  useEffect(() => {
    const fetchOvertimeLimits = async () => {
      try {
        const snap = await getDocs(collection(db, "overtimeLimits"));
        const data = {};
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.memberId && d.lastOvertimeDate)
            data[d.memberId] = d.lastOvertimeDate;
        });
        setOvertimeDates(data);
      } catch (err) {
        console.error("❌ Lỗi tải overtimeLimits:", err);
      }
    };
    fetchOvertimeLimits();
  }, []);

  const handleEarlyShiftToggle = async (m, checked) => {
    try {
      const isNight = (m.shift || "").toLowerCase().includes("đêm");
      const newShiftStart = checked
        ? isNight
          ? "19:00"
          : "07:00"
        : isNight
        ? "20:00"
        : "08:00";

      const today = dayjs().format("YYYY-MM-DD");
      const dateStr = selectedDate
        ? dayjs(selectedDate).format("YYYY-MM-DD")
        : today;

      let shiftName = m.shift;
      if (shiftSchedules?.[dateStr]) {
        const dateData = shiftSchedules[dateStr];
        const todayShift = Object.values(dateData).find(
          (s) => s.memberId === m.id
        );
        if (todayShift) shiftName = todayShift.shift;
        else if (dateData[m.realName]) shiftName = dateData[m.realName].shift;
      }

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

      const memberRef = doc(db, "members", m.id);
      await updateDoc(memberRef, {
        earlyShift: checked,
        shiftStart: newShiftStart,
        shift: shiftName,
        updatedDate: today,
        updatedAt: serverTimestamp(),
      });

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

      console.log(
        `✅ ${m.realName} cập nhật ${shiftName} (${newShiftStart}) - ${today}`
      );
    } catch (err) {
      console.error("❌ Lỗi cập nhật Firestore:", err);
      alert("Không thể cập nhật Firestore. Kiểm tra console để biết chi tiết.");
    }
  };

  return (
    <div
      className="relative border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden flex flex-col"
      style={{ maxHeight: "50vh", minHeight: "200px" }}
    >
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold z-10">
            <tr className="[&>th]:border-b [&>th]:border-gray-300 dark:[&>th]:border-gray-700">
              <th className="p-2 text-center w-12">
                <div className="flex items-center justify-center gap-1">
                  <List className="w-4 h-4 text-blue-500" />
                  <span>STT</span>
                </div>
              </th>
              <th className="p-2 text-center w-36">
                <div className="flex items-center justify-center gap-1">
                  <CircleUser className="w-4 h-4 text-blue-500" />
                  <span>Tên Chính</span>
                </div>
              </th>
              <th className="p-2 text-center w-40">
                <div className="flex items-center justify-center gap-1">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>Tên Phụ</span>
                </div>
              </th>
              <th className="p-2 text-center w-24">
                <div className="flex items-center justify-center gap-1">
                  <BriefcaseBusiness className="w-4 h-4 text-blue-500" />
                  <span>Ca</span>
                </div>
              </th>
              <th className="p-2 text-center w-24">
                <div className="flex items-center justify-center gap-1">
                  <BedDouble className="w-4 h-4 text-pink-500" />
                  <span>Nghỉ luân phiên</span>
                </div>
              </th>
              <th className="p-2 text-center w-20">
                <div className="flex items-center justify-center gap-1">
                  <ClockArrowUp className="w-4 h-4 text-blue-500" />
                  <span>Lên ca</span>
                </div>
              </th>
              <th className="p-2 text-center w-20">
                <div className="flex items-center justify-center gap-1">
                  <Hourglass className="w-4 h-4 text-green-500" />
                  <span>Giới hạn</span>
                </div>
              </th>
              <th className="p-2 text-center w-20">
                <div className="flex items-center justify-center gap-1">
                  <ClockFading className="w-4 h-4 text-yellow-500" />
                  <span>Đã tăng</span>
                </div>
              </th>
              <th className="p-2 text-center w-20">
                <div className="flex items-center justify-center gap-1">
                  <CalendarClock className="w-4 h-4 text-indigo-500" />
                  <span>Tổng</span>
                </div>
              </th>
              <th className="p-2 text-center w-24">
                <div className="flex items-center justify-center gap-1">
                  <CalendarDays className="w-4 h-4 text-teal-500" />
                  <span>Ngày</span>
                </div>
              </th>
              <th className="p-2 text-center w-24">
                <div className="flex items-center justify-center gap-1">
                  <Timer className="w-4 h-4 text-purple-500" />
                  <span>Lên ca sớm</span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="text-center">
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan="11"
                  className="text-center py-4 text-gray-400 dark:text-gray-500 border-t border-gray-300 dark:border-gray-700"
                >
                  Không có nhân viên.
                </td>
              </tr>
            ) : (
              members.map((m, index) => {
                const limit = m.overtimeLimit?.monthlyLimit || 0;
                const worked = m.overtimeLimit?.workedHours || 0;
                const total = limit + worked;
                const dateDisplay =
                  overtimeDates[m.id] ||
                  m.overtimeLimit?.lastOvertimeDate ||
                  "-";

                const currentDate = selectedDate
                  ? dayjs(selectedDate).format("YYYY-MM-DD")
                  : dayjs().format("YYYY-MM-DD");

                const weekday = dayjs(currentDate).day();
                const restDay =
                  weekday === 0 ? "Chủ nhật" : `-`;

                let shiftName = m.shift;
                let shiftStart = m.shiftStart;

                if (shiftSchedules[currentDate]) {
                  const dateData = shiftSchedules[currentDate];
                  const todayShift = Object.values(dateData).find(
                    (s) => s.memberId === m.id
                  );
                  if (todayShift) {
                    shiftName = todayShift.shift;
                    shiftStart = todayShift.shiftStart;
                  } else if (dateData[m.realName]) {
                    shiftName = dateData[m.realName].shift;
                    shiftStart = dateData[m.realName].shiftStart;
                  }
                }

                shiftStart = shiftStart || m.shiftStart || "08:00";

                return (
                  <tr
                    key={m.id}
                    className="hover:bg-purple-100 dark:hover:bg-gray-800 transition-colors border-t border-gray-300 dark:border-gray-700"
                  >
                    <td className="p-2 font-medium">{index + 1}</td>
                    <td className="p-2">{m.realName}</td>
                    <td className="p-2">{m.nickname}</td>
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
                    <td className="p-2 text-pink-600 dark:text-pink-400 font-semibold">
                      {restDay}
                    </td>
                    <td className="p-2">{shiftStart}</td>
                    <td className="p-2 text-green-600 dark:text-green-400 font-semibold">
                      {fmt(limit)}
                    </td>
                    <td className="p-2 text-yellow-600 dark:text-yellow-400 font-semibold">
                      {fmt(worked)}
                    </td>
                    <td className="p-2 text-indigo-700 dark:text-indigo-400 font-semibold">
                      {fmt(total)}
                    </td>
                    <td className="p-2 text-teal-600 dark:text-teal-400 font-semibold">
                      {dateDisplay}
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={m.earlyShift || false}
                        onChange={(e) =>
                          handleEarlyShiftToggle(m, e.target.checked)
                        }
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-300 dark:border-gray-700 mt-auto" />
    </div>
  );
}
