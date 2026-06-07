// components/OverMember.js
// Hiển thị thông tin tăng ca của một nhân viên trong danh sách

import { useState, useEffect } from "react";
import PopupCalendar from "./PopupCalendar";
import PopupSettings from "./PopupSettings";
import { ICONS } from "../utils/iconUtils";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import dayjs from "dayjs";
import { Trash2, User, IdCard, CalendarCheck } from "lucide-react";

function formatHours(n) {
  return `${Number(n || 0).toLocaleString()} giờ`;
}

export default function OverMember({
  user = null,
  overtimes = [],
  selectedMonth,
  selectedYear,
  selectedDate,
  members = [],
  setMembers = () => {},
}) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shiftSchedules, setShiftSchedules] = useState({});

  // 🔹 Load members realtime
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "members"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          overtimeLimit: d.data().overtimeLimit || {},
        }))
      );
    });
    return () => unsub();
  }, [user?.uid]);

  // 🔹 Load shiftSchedules realtime
  useEffect(() => {
    if (!user?.uid) return;
    const safeDate = selectedDate ? dayjs(selectedDate) : dayjs();
    const start = safeDate.startOf("month").format("YYYY-MM-DD");
    const end = safeDate.endOf("month").format("YYYY-MM-DD");

    const q = query(
      collection(db, "shiftSchedules"),
      where("userId", "==", user.uid),
      where("date", ">=", start),
      where("date", "<=", end)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = {};
      snap.docs.forEach((d) => {
        const item = d.data();
        if (!data[item.date]) data[item.date] = {};
        data[item.date][item.realName] = {
          shift: item.shift,
          shiftStart: item.shiftStart,
          memberId: item.memberId,
          lenCa: item.lenCa || "",
          xuongCa: item.xuongCa || "",
          tangCaHomNay: item.tangCaHomNay || 0,
          thuong: item.thuong || 0,
          note: item.note || "",
        };
      });
      setShiftSchedules(data);
    });

    return () => unsub();
  }, [user?.uid, selectedDate]);

  const getTodayStatus = (member) => {
    const safeDate = selectedDate ? dayjs(selectedDate) : dayjs();
    const dateStr = safeDate.format("YYYY-MM-DD");
    const formatted = safeDate.format("DD/MM/YYYY");

    // Lấy dữ liệu tăng ca từ bảng overtimes
    const todayOvertime = overtimes.find(
      (o) =>
        o.memberId === member.id &&
        (o.date === dateStr || o.currentDate === dateStr)
    );

    // Nếu overtimes không có thì fallback sang shiftSchedules
    let checkIn = todayOvertime?.checkIn || todayOvertime?.lenCa || "";
    let checkOut =
      todayOvertime?.checkOut ||
      todayOvertime?.xuongCa ||
      shiftSchedules?.[dateStr]?.[member.realName]?.xuongCa ||
      "";
    let note = todayOvertime?.note?.trim() || "";

    // ⬇️ PATCH QUAN TRỌNG: fallback chi tiết từ shiftSchedules nếu overtimes thiếu
    if (!todayOvertime && shiftSchedules?.[dateStr]) {
      const dateData = shiftSchedules[dateStr];
      const s = Object.values(dateData).find((x) => x.memberId === member.id);
      if (s) {
        checkIn = s.lenCa || "";
        checkOut = s.xuongCa || "";
        note = s.note || "";
      }
    }

    const noteMap = {
      休: "nghỉ luân phiên",
      年假: "phép năm",
      事假: "nghỉ việc riêng",
      病假: "nghỉ bệnh",
      调休: "nghỉ bù",
      婚假: "nghỉ cưới",
      丧假: "nghỉ tang",
      产假: "nghỉ sinh con",
      陪产假: "nghỉ chăm vợ sinh",
      工伤假: "nghỉ do tai nạn lao động",
      产检假: "nghỉ khám thai",
      哺乳假: "nghỉ cho con bú",
      旷工: "nghỉ không phép",
      "4h事假": "nghỉ việc riêng 4 tiếng",
    };

    const translatedNote = noteMap[note] || note;

    if (note) {
      return {
        text: `${formatted} ${translatedNote}`,
        color: "text-orange-500",
      };
    }

    if (checkIn || checkOut) {
      const checkOutDisplay = checkOut || "__";
      const hours =
        todayOvertime?.tangCaHomNay ||
        shiftSchedules?.[dateStr]?.[member.realName]?.tangCaHomNay ||
        0;
      const bonus =
        todayOvertime?.thuong ||
        shiftSchedules?.[dateStr]?.[member.realName]?.thuong ||
        0;

      const node = (
        <span className="text-gray-800 dark:text-gray-200">
          Check-in: <span className="text-green-600">{checkIn || "__"}</span>
          {" • "}Check-out:{" "}
          <span className="text-green-600">{checkOut || "__"}</span>
          {hours > 0 && (
            <>
              {" • "}
              <span className="text-emerald-600">+{hours}h</span>
              <span className="text-yellow-600">+{bonus}</span>
            </>
          )}
        </span>
      );

      const color = checkOut
        ? "text-blue-600 dark:text-blue-400"
        : "text-green-600 dark:text-green-400";

      return { node, color };
    }

    return {
      text: "chưa có dữ liệu chấm công",
      color: "text-gray-400 dark:text-gray-500",
    };
  };

  const removeOvertimeOfDay = async (realName, memberId) => {
    const currentDate = dayjs(selectedDate).format("YYYY-MM-DD");

    if (
      !confirm(
        `Xóa dữ liệu tăng ca + ca làm ngày ${currentDate} của "${realName}"?`
      )
    )
      return;

    try {
      // ========================= 1) LẤY MEMBER =========================
      const mQuery = query(
        collection(db, "members"),
        where("userId", "==", user.uid),
        where("realName", "==", realName)
      );
      const mSnap = await getDocs(mQuery);

      if (mSnap.empty) return alert("Không tìm thấy nhân viên!");

      const mDoc = mSnap.docs[0];
      const member = mDoc.data();

      let oldWorked = Number(member.overtimeLimit?.workedHours || 0);
      const monthlyLimit = Number(member.overtimeLimit?.monthlyLimit || 0);

      // ========================= 2) LẤY OVERTIME CỦA NGÀY =========================
      const q = query(
        collection(db, "overtimes"),
        where("userId", "==", user.uid),
        where("realName", "==", realName)
      );
      const snap = await getDocs(q);

      const needDelete = [];
      let totalRemovedHours = 0;
      let totalRemovedBonus = 0;

      snap.forEach((d) => {
        const data = d.data();
        let dateKey = null;

        if (data.currentDate?.toDate) {
          dateKey = dayjs(data.currentDate.toDate()).format("YYYY-MM-DD");
        } else if (typeof data.currentDate === "string") {
          dateKey = data.currentDate.slice(0, 10);
        } else if (typeof data.date === "string") {
          dateKey = data.date.slice(0, 10);
        }

        if (dateKey === currentDate) {
          needDelete.push(d.id);
          totalRemovedHours += Number(data.addedHours || 0);
          totalRemovedBonus += Number(data.bonusGiven || 0);
        }
      });

      // XOÁ OT
      await Promise.all(
        needDelete.map((id) => deleteDoc(doc(db, "overtimes", id)))
      );

      // ========================= 3) RESET shiftSchedules =========================
      const shiftQuery = query(
        collection(db, "shiftSchedules"),
        where("userId", "==", user.uid),
        where("realName", "==", realName),
        where("date", "==", currentDate)
      );
      const shiftSnap = await getDocs(shiftQuery);

      await Promise.all(
        shiftSnap.docs.map((d) =>
          updateDoc(doc(db, "shiftSchedules", d.id), {
            lenCa: "",
            xuongCa: "",
            tangCaHomNay: 0,
            thuong: 0,
            note: "",
            otCounted: false,
            checkinType: "",
            session: "",
            manualLeave: false,
          })
        )
      );

      // ========================= 4) UPDATE workedHours =========================
      const newWorked = Math.max(oldWorked - totalRemovedHours, 0);
      const newRemaining = Math.max(monthlyLimit - newWorked, 0);

      await updateDoc(doc(db, "members", mDoc.id), {
        "overtimeLimit.workedHours": newWorked,
        "overtimeLimit.remaining": newRemaining,
      });

      // ========================= 5) UPDATE limit_xx =========================
      try {
        if (monthlyLimit > 0) {
          const limitRef = doc(db, "overtimeLimits", `limit_${monthlyLimit}`);
          const limitSnap = await getDoc(limitRef);

          if (limitSnap.exists()) {
            const limitData = limitSnap.data();
            const membersArr = Array.isArray(limitData.members)
              ? limitData.members
              : [];

            const idx = membersArr.findIndex(
              (mm) => String(mm.id) === String(memberId)
            );

            if (idx !== -1) {
              let mm = membersArr[idx];

              // ===== TRỪ GIỜ =====
              mm.gioDaLam = Math.max((mm.gioDaLam || 0) - totalRemovedHours, 0);
              mm.gioConLai = Math.max(
                (mm.tongGioKeHoach || 0) - mm.gioDaLam,
                0
              );

              // ===== TRỪ GIỜ THƯỞNG =====
              mm.gioThuongDaNhan = Math.max(
                (mm.gioThuongDaNhan || 0) - totalRemovedBonus,
                0
              );
              mm.gioThuongConLai = Math.max(
                (mm.tongGioThuong || 0) - mm.gioThuongDaNhan,
                0
              );

              // ===== TRỪ NGÀY — CHỈ TRỪ SỐ RECORD TRONG NGÀY =====
              mm.soNgayDaLam = Math.max(
                (mm.soNgayDaLam || 0) - needDelete.length,
                0
              );

              mm.ngayConLai = Math.max(
                (limitData.days || 0) - mm.soNgayDaLam,
                0
              );

              membersArr[idx] = mm;

              await updateDoc(limitRef, {
                members: membersArr,
                updatedAt: serverTimestamp(),
              });

              console.log("⭐ updated limit_xx cho:", realName);
            }
          }
        }
      } catch (err) {
        console.error("🔥 Lỗi update overtimeLimits:", err);
      }

      // ========================= DONE =========================
      alert(
        `Đã xóa ${needDelete.length} bản ghi.\n` +
          `Giảm ${totalRemovedHours} giờ & ${totalRemovedBonus} thưởng.\n` +
          `WorkedHours: ${oldWorked} → ${newWorked}`
      );
    } catch (err) {
      console.error("🔥 FIREBASE ERROR:", err);
      alert("Có lỗi xảy ra khi xóa dữ liệu!");
    }
  };

  return (
    <div>
      <h3 className="text-base font-semibold flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-200">
        <User className="w-4 h-4" /> Danh sách nhân viên
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 text-sm">
            Không có nhân viên nào.
          </div>
        ) : (
          members.map((m) => {
            const status = getTodayStatus(m);
            const limit = m.overtimeLimit?.monthlyLimit || 0;
            const done = m.overtimeLimit?.workedHours || 0;
            const remaining = Math.max(limit - done, 0);

            const dateStr = dayjs(selectedDate).format("YYYY-MM-DD");

            // ✅ Ưu tiên tìm ca làm theo memberId (đồng bộ chuẩn)
            let shiftData = null;
            if (shiftSchedules?.[dateStr]) {
              const dateData = shiftSchedules[dateStr];
              shiftData = Object.values(dateData).find(
                (s) => s.memberId === m.id
              );
              if (!shiftData) shiftData = dateData[m.realName];
            }

            const shift = shiftData?.shift || m.shift || "Chưa có ca";
            const shiftStart =
              shiftData?.shiftStart || m.shiftStart || "lên_ca_ngày_muộn";

            const shiftStartLabel =
              {
                lên_ca_ngày_sớm: "Sáng sớm",
                lên_ca_ngày_muộn: "Sáng muộn",
                lên_ca_đêm_sớm: "Tối sớm",
                lên_ca_đêm_muộn: "Tối muộn",
              }[shiftStart] || shiftStart;

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center">
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
                      <div className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                        {m.realName}
                      </div>
                      {m.nickname && (
                        <div className="text-[12px] text-gray-500 dark:text-gray-400">
                          “{m.nickname}”
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setShowCalendar(true);
                      }}
                      className="p-1.5 rounded-md bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-800/40 dark:text-orange-400"
                      title="Lịch tăng ca"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setShowSettings(true);
                      }}
                      className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
                      title="Thông tin"
                    >
                      <IdCard className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => removeOvertimeOfDay(m.realName, m.id)}
                      className="p-1.5 rounded-md bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/40 dark:hover:bg-red-800/40 dark:text-red-400"
                      title="Xóa dữ liệu hôm nay"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 dark:text-gray-500">
                  Ngày:{" "}
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString("vi-VN")
                    : new Date().toLocaleDateString("vi-VN")}
                </div>
                <div className={`text-sm font-medium mt-1 ${status.color}`}>
                  {status.node || status.text}
                </div>

                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {shift} • {shiftStartLabel}
                </div>

                <div className="flex justify-between mt-3 text-[12px]">
                  <span className="text-orange-500 dark:text-orange-400">
                    Giới hạn: <b>{formatHours(limit)}</b>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Đã tăng: <b>{formatHours(done)}</b>
                  </span>
                  <span
                    className={`font-semibold ${
                      remaining === 0
                        ? "text-red-500 dark:text-red-400"
                        : "text-sky-600 dark:text-sky-400"
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

      {showCalendar && selectedMember && (
        <PopupCalendar
          member={selectedMember}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          overtimeItems={overtimes.filter((o) => {
            // chỉ lấy cùng user
            if (o.userId !== selectedMember.userId) return false;

            // match theo memberId nếu có, nếu không thì fallback realName
            if (o.memberId && selectedMember.id) {
              return String(o.memberId) === String(selectedMember.id);
            }
            if (o.realName && selectedMember.realName) {
              return String(o.realName) === String(selectedMember.realName);
            }

            // nếu không có 2 trường trên, vẫn chấp nhận (best effort)
            return true;
          })}
          shiftSchedules={shiftSchedules}
          onClose={() => setShowCalendar(false)}
        />
      )}

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
