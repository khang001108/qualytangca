import { useState, useEffect } from "react";
import PopupCalendar from "./PopupCalendar";
import PopupSettings from "./PopupSettings";
import { ICONS } from "../utils/iconUtils";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import dayjs from "dayjs";
import { Trash2, User, IdCard, CalendarCheck } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

function formatHours(n) {
  return `${Number(n || 0).toLocaleString()} giờ`;
}

// 🔹 Hàm tính giờ tăng ca dựa trên giờ ca & checkOut
function calcOvertimeHours(shiftStart, checkOut) {
  if (!checkOut) return 0;
  const [sH, sM] = shiftStart.split(":").map(Number);
  const endAdminMinutes = (sH + 9) * 60 + (sM || 0);
  const [oH, oM] = checkOut.split(":").map(Number);
  const outMinutes = oH * 60 + (oM || 0);
  const diff = outMinutes - endAdminMinutes;
  if (diff <= 0 || diff < 60) return 0;
  return Math.floor(diff / 60);
}

export default function OverMember({
  user = null,
  overtimes = [],
  selectedMonth,
  selectedYear,
  selectedDate,
  members = [],
  setMembers = () => { },
  shiftSchedules = {}, // ✅ thêm dòng này
}) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 🟢 Load members từ Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "members"), where("userId", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMembers(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            overtimeLimit: d.data().overtimeLimit || {},
          }))
        );
      },
      (err) => console.error("Firestore snapshot error:", err)
    );
    return () => unsub();
  }, [user?.uid]);

  // 🧠 Lấy trạng thái tăng ca hôm nay
  const getTodayStatus = (member) => {
    const targetDate = selectedDate ? dayjs(selectedDate) : dayjs();
    const dateStr = targetDate.format("YYYY-MM-DD");
    const formatted = targetDate.format("DD/MM/YYYY");

    // Tìm bản ghi chấm công trong ngày
    const todayOvertime = overtimes.find(
      (o) =>
        (o.realName === member.realName ||
          o.realName.includes(member.nickname) ||
          member.realName.includes(o.realName)) &&
        o.currentDate === dateStr
    );
    console.log("DEBUG:", member.realName, dateStr, todayOvertime);



    const checkIn = todayOvertime?.checkIn || "";
    const checkOut = todayOvertime?.checkOut || "";
    const note = todayOvertime?.note?.trim() || "";

    // Bản dịch ghi chú
    const noteMap = {
      "休": "nghỉ luân phiên",
      "年假": "phép năm",
      "事假": "nghỉ việc riêng",
      "病假": "nghỉ bệnh",
      "调休": "nghỉ bù",
      "婚假": "nghỉ cưới",
      "丧假": "nghỉ tang",
      "产假": "nghỉ sinh con",
      "陪产假": "nghỉ chăm vợ sinh",
      "工伤假": "nghỉ do tai nạn lao động",
      "产检假": "nghỉ khám thai",
      "哺乳假": "nghỉ cho con bú",
      "旷工": "nghỉ không phép",
      "4h事假": "nghỉ việc riêng 4 tiếng",
    };

    const translatedNote = noteMap[note] || note;

    // --- Nếu có ghi chú nghỉ ---
    if (note) {
      return {
        text: `${formatted} ${translatedNote}`,
        color: "text-orange-500",
      };
    }

    // --- Nếu có giờ vào ra ---
    if (checkIn || checkOut) {
      const checkOutDisplay = checkOut || "__";
      const hours = calcOvertimeHours(member.shiftStart || "07:00", checkOut);
      let text = `Check-in: ${checkIn || "__"} • Check-out: ${checkOutDisplay}`;
      if (hours > 0) text += ` • +${hours}h`;
      const color = checkOut ? "text-blue-600" : "text-green-600";
      return { text, color };
    }

    // --- Nếu không có dữ liệu ---
    return {
      text: `chưa có dữ liệu chấm công`,
      color: "text-gray-400",
    };
  };



  // 🗑 Xóa dữ liệu tăng ca ngày hiện tại
  const removeOvertimeOfDay = async (realName) => {
    if (!confirm(`Xóa toàn bộ dữ liệu tăng ca ngày này của "${realName}"?`))
      return;

    try {
      const {
        collection,
        query,
        where,
        getDocs,
        deleteDoc,
        doc,
        updateDoc,
      } = await import("firebase/firestore");

      const currentDate = dayjs(selectedDate).format("YYYY-MM-DD");

      // 🔹 1. Xóa document trong overtimes
      const q = query(
        collection(db, "overtimes"),
        where("userId", "==", user.uid),
        where("realName", "==", realName),
        where("currentDate", "==", currentDate)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        alert(`Không có dữ liệu tăng ca ngày ${currentDate}.`);
        return;
      }

      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "overtimes", d.id)))
      );

      // 🔹 2. Reset trạng thái check-in/out trong members
      const mQuery = query(
        collection(db, "members"),
        where("userId", "==", user.uid),
        where("realName", "==", realName)
      );
      const mSnap = await getDocs(mQuery);

      if (!mSnap.empty) {
        const mDoc = mSnap.docs[0];
        await updateDoc(doc(db, "members", mDoc.id), {
          lastCheckInDate: "",
          lastCheckInTime: "",
          lastCheckOutTime: "",
        });
      }

      alert(`✅ Đã xóa dữ liệu tăng ca ngày ${currentDate} của ${realName}`);
    } catch (err) {
      console.error("Lỗi xóa dữ liệu tăng ca:", err);
    }
  };


  return (
    <div>
      <h3 className="text-base font-semibold flex items-center gap-2 mb-3 text-gray-700">
        <User className="w-4 h-4" /> Danh sách nhân viên
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.length === 0 ? (
          <div className="bg-white p-4 rounded-xl shadow border text-center text-gray-500 text-sm">
            Không có nhân viên nào.
          </div>
        ) : (
          members.map((m) => {
            const status = getTodayStatus(m);
            const limit = m.overtimeLimit?.monthlyLimit || 0;
            const done = m.overtimeLimit?.workedHours || 0;
            const remaining = Math.max(limit - done, 0);
            const shiftName =
              {
                "07:00": "Sáng sớm",
                "08:00": "Sáng muộn",
                "19:00": "Tối sớm",
                "20:00": "Tối muộn",
              }[m.shiftStart] || m.shiftStart;

            return (
              <div
                key={m.id}
                className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {/* Hàng trên: Avatar + Info */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-indigo-700 font-semibold">
                      {(() => {
                        const match = ICONS.find((i) => i.name === m.avatar);
                        const Icon = match ? match.icon : User;
                        const color = m.color || "#3B82F6";
                        return (
                          <div
                            className="w-10 h-10 flex items-center justify-center rounded-lg"
                            style={{ backgroundColor: color + "20" }}
                          >
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <div className="font-medium text-gray-800 text-sm">
                        {m.realName}
                      </div>
                      {m.nickname && (
                        <div className="text-[12px] text-gray-500">
                          “{m.nickname}”
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setShowCalendar(true);
                      }}
                      className="p-1.5 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-700"
                      title="Lịch tăng ca"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setShowSettings(true);
                      }}
                      className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                      title="Thông tin"
                    >
                      <IdCard className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => removeOvertimeOfDay(m.realName)}
                      className="p-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-600"
                      title="Xóa dữ liệu hôm nay"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Trạng thái */}
                <div className="text-[11px] text-gray-400">
                  Ngày: {selectedDate ? new Date(selectedDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}
                </div>
                <div className={`text-sm font-medium mt-1 ${status.color}`}>
                  {status.text}
                </div>

                {/* Giờ ca (hiển thị theo shiftSchedules) */}
                {(() => {
                  // 🔹 Lấy ngày đang chọn
                  const dateStr = selectedDate
                    ? dayjs(selectedDate).format("YYYY-MM-DD")
                    : dayjs().format("YYYY-MM-DD");

                  // 🔹 Lấy dữ liệu phân ca từ shiftSchedules
                  const shiftData = shiftSchedules?.[dateStr]?.[m.realName];
                  const shiftDisplay = shiftData?.shift || m.shift || "Chưa có ca";
                  const shiftStart = shiftData?.shiftStart || m.shiftStart || "08:00";

                  const shiftStartLabel =
                    {
                      "07:00": "Sáng sớm",
                      "08:00": "Sáng muộn",
                      "19:00": "Tối sớm",
                      "20:00": "Tối muộn",
                    }[shiftStart] || shiftStart;

                  return (
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {shiftDisplay} • {shiftStartLabel}
                    </div>
                  );
                })()}



                {/* Tóm tắt */}
                <div className="flex justify-between mt-3 text-[12px]">
                  <span className="text-orange-500">
                    Giới hạn: <b>{formatHours(limit)}</b>
                  </span>
                  <span className="text-emerald-600">
                    Đã tăng: <b>{formatHours(done)}</b>
                  </span>
                  <span
                    className={`font-semibold ${remaining === 0 ? "text-red-500" : "text-sky-600"
                      }`}
                  >
                    Còn: {formatHours(remaining)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Popup Lịch */}
      {showCalendar && selectedMember && (
        <PopupCalendar
          member={selectedMember}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          overtimeItems={overtimes.filter(
            (o) =>
              o.realName === selectedMember.realName &&
              o.userId === selectedMember.userId
          )}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Popup Cài đặt */}
      {showSettings && selectedMember && (
        <PopupSettings
          member={selectedMember}
          members={members}
          setMembers={setMembers}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );

}

function SummaryBox({ label, value, color = "text-indigo-700" }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <div className="bg-indigo-50/40 rounded-xl p-3 border border-indigo-100 flex flex-col items-center">
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`font-semibold mt-1 ${color}`}>{value}</div>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content
        side="top"
        align="center"
        className="rounded-md bg-gray-800 text-white text-xs px-2 py-1"
      >
        {label}: {value}
        <Tooltip.Arrow className="fill-gray-800" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}
