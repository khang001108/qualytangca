import React from "react";
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
} from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function MembersTable({
  members = [],
  setMembers,
  user,
  selectedDate,
  shiftSchedules = {},
}) {
  const fmt = (n) => `${Number(n || 0).toLocaleString()}h`;

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

      // ✅ Tìm ca thực tế trong shiftSchedules (ưu tiên memberId)
      let shiftName = m.shift;
      if (shiftSchedules?.[dateStr]) {
        const dateData = shiftSchedules[dateStr];
        const todayShift = Object.values(dateData).find(
          (s) => s.memberId === m.id
        );
        if (todayShift) shiftName = todayShift.shift;
        else if (dateData[m.realName]) shiftName = dateData[m.realName].shift;
      }

      // ✅ Cập nhật UI
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

      // ✅ Cập nhật Firestore: members
      const memberRef = doc(db, "members", m.id);
      await updateDoc(memberRef, {
        earlyShift: checked,
        shiftStart: newShiftStart,
        shift: shiftName,
        updatedDate: today,
        updatedAt: serverTimestamp(),
      });

      // ✅ Cập nhật Firestore: shiftSchedules
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
      className="relative border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden"
      style={{ height: "40vh" }}
    >
      {/* Wrapper cuộn */}
      <div className="h-full overflow-y-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold z-10">
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
                  colSpan="9"
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
                const currentDate = selectedDate
                  ? dayjs(selectedDate).format("YYYY-MM-DD")
                  : dayjs().format("YYYY-MM-DD");

                let shiftName = m.shift;
                let shiftStart = m.shiftStart;

                // ✅ Lấy ca từ shiftSchedules (ưu tiên memberId)
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

      {/* ✅ Giữ border dưới khi cuộn */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-300 dark:border-gray-700" />
    </div>
  );
}
