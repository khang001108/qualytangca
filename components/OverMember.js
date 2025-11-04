import { useState, useEffect } from "react";
import PopupCalendar from "./PopupCalendar";
import PopupSettings from "./PopupSettings";
import { ICONS } from "../utils/iconUtils";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
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
  setMembers = () => {},
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
<<<<<<< HEAD
        setMembers(
          snap.docs.map((d) => ({
=======
        if (!snap?.docs) return;
        setMembers((prev) => {
          const updated = snap.docs.map((d) => ({
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
            id: d.id,
            ...d.data(),
            overtimeLimit: d.data().overtimeLimit || {},
          }));

          // 🔹 Nếu member cũ có trong prev (vừa cập nhật), giữ lại state mới nhất
          return updated.map((m) => {
            const local = prev.find((x) => x.id === m.id);
            return local ? { ...m, ...local } : m;
          });
        });
      },
      (err) => console.error("Firestore snapshot error:", err)
    );

    return () => unsub();
  }, [user?.uid]);

<<<<<<< HEAD
  // 🧠 Lấy trạng thái tăng ca hôm nay
=======
  // ESC để đóng modal
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleChange = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "shift")
        next.shiftStart = v.includes("đêm") ? "19:00" : "07:00";
      return next;
    });
  };

  // ➕ Thêm nhân viên mới
  const addMember = async (e) => {
    e?.preventDefault();
    if (!form.realName.trim()) return alert("Nhập tên nhân viên");
    setSaving(true);
    const payload = {
      realName: form.realName.trim(),
      nickname:
        form.nickname.trim() || form.realName.trim().charAt(0).toUpperCase(),
      shift: form.shift,
      shiftStart: form.shiftStart,
      createdAt: serverTimestamp(),
      overtimeLimit: {
        workedHours: 0,
        monthlyLimit: 0,
        remaining: 0,
      },
      lastCheckInDate: null,
      lastCheckInTime: null,
      lastCheckOutTime: null,
    };

    try {
      if (user) {
        await addDoc(collection(db, "members"), {
          ...payload,
          userId: user.uid,
        });
      } else {
        setMembers((prev) => [
          { id: `local-${Date.now()}`, ...payload },
          ...prev,
        ]);
      }
      setForm({
        realName: "",
        nickname: "",
        shift: "Ca ngày",
        shiftStart: "07:00",
      });
      setOpen(false);
    } catch (err) {
      console.error("Lỗi thêm member:", err);
      alert("Thêm thất bại");
    } finally {
      setSaving(false);
    }
  };

  // 🗑 Xóa nhân viên
  // 🗑 Xóa dữ liệu tăng ca của nhân viên trong ngày đang chọn
  const removeOvertimeOfDay = async (realName) => {
    if (
      !confirm(`Xóa toàn bộ dữ liệu tăng ca của "${realName}" trong ngày này?`)
    )
      return;

    try {
      const { collection, query, where, getDocs, deleteDoc, doc } =
        await import("firebase/firestore");
      const currentDate = new Date(selectedDate).toISOString().split("T")[0];

      const q = query(
        collection(db, "overtimes"),
        where("userId", "==", user.uid),
        where("realName", "==", realName),
        where("currentDate", "==", currentDate)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        alert(
          `Không có dữ liệu tăng ca ngày ${currentDate} của nhân viên ${realName}.`
        );
        return;
      }

      await Promise.all(
        snap.docs.map((d) => deleteDoc(doc(db, "overtimes", d.id)))
      );
      alert(`✅ Đã xóa dữ liệu tăng ca ngày ${currentDate} của "${realName}".`);
    } catch (err) {
      console.error("Xóa dữ liệu thất bại:", err);
      alert("❌ Lỗi khi xóa dữ liệu tăng ca.");
    }
  };

  // 🧠 Lấy trạng thái hôm nay (check-in/out)
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
  const getTodayStatus = (member) => {
    const targetDate = selectedDate
      ? new Date(selectedDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const todayOvertime = overtimes.find(
      (o) => o.realName === member.realName && o.currentDate === targetDate
    );

    const checkIn = todayOvertime?.checkIn || "";
    const checkOut = todayOvertime?.checkOut || "";

    const hours =
      checkIn && checkOut
        ? calcOvertimeHours(member.shiftStart || "07:00", checkOut)
        : 0;

    let text = "Chưa có dữ liệu ngày này";
    let color = "text-gray-400";

    if (checkIn && !checkOut) {
      text = `Lên ca: ${checkIn}`;
      color = "text-green-600";
    } else if (checkIn && checkOut) {
      text = `Lên: ${checkIn} • Xuống: ${checkOut}`;
      if (hours > 0) text += ` • +${hours}h`;
      color = hours > 0 ? "text-blue-600" : "text-gray-500";
    }

    return { text, color };
  };

  // 🗑 Xóa dữ liệu tăng ca ngày hiện tại
  const removeOvertimeOfDay = async (realName) => {
    if (!confirm(`Xóa toàn bộ dữ liệu tăng ca ngày này của "${realName}"?`))
      return;

    try {
      const { collection, query, where, getDocs, deleteDoc, doc } =
        await import("firebase/firestore");
      const currentDate = new Date(selectedDate).toISOString().split("T")[0];

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
      alert(`✅ Đã xóa dữ liệu tăng ca ngày ${currentDate} của ${realName}`);
    } catch (err) {
      console.error("Lỗi xóa dữ liệu tăng ca:", err);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <User className="w-5 h-5" /> Tổng quan nhân viên
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow border text-center text-gray-500">
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

<<<<<<< HEAD
            return (
              <div
                key={m.id}
                className="bg-gradient-to-br from-white to-blue-50 p-4 rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {/* Icon nhân viên */}
                    <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                      {(() => {
                        const match = ICONS.find((i) => i.name === m.avatar);
                        if (!match) {
                          return m.nickname
                            ? m.nickname.charAt(0).toUpperCase()
                            : m.realName
                            ? m.realName.charAt(0).toUpperCase()
                            : "N";
                        }
                        const Icon = match.icon;
                        return <Icon className="w-6 h-6 text-indigo-600" />;
                      })()}
=======
              return (
                <div
                  key={m.id}
                  className="bg-gradient-to-br from-white to-blue-50 p-4 rounded-2xl shadow-sm border border-gray-100"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                        {(() => {
                          const match = ICONS.find((i) => i.name === m.avatar);
                          if (!match) {
                            return m.nickname
                              ? m.nickname.charAt(0).toUpperCase()
                              : m.realName
                              ? m.realName.charAt(0).toUpperCase()
                              : "N";
                          }
                          const Icon = match.icon;
                          return <Icon className="w-6 h-6 text-indigo-600" />;
                        })()}
                      </div>

                      <div>
                        <div className="font-semibold text-gray-800">
                          {m.realName || "Không tên"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {m.nickname ? `“${m.nickname}”` : ""}
                        </div>
                        <div
                          className={`text-xs mt-1 font-medium ${status.color}`}
                        >
                          {status.text}
                        </div>
                        {selectedDate && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Ngày:{" "}
                            {new Date(selectedDate).toISOString().split("T")[0]}
                          </div>
                        )}

                        <div className="text-xs text-gray-400 mt-1">
                          {m.shift} • {shiftName}
                        </div>
                      </div>
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
                    </div>

                    {/* Thông tin nhân viên */}
                    <div>
                      <div className="font-semibold text-gray-800">
                        {m.realName}
                      </div>
                      {m.nickname && (
                        <div className="text-sm text-gray-500">
                          “{m.nickname}”
                        </div>
                      )}
                      <div
                        className={`text-xs mt-1 font-medium ${status.color}`}
                      >
                        {status.text}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        {m.shift} • {shiftName}
                      </div>
                    </div>
                  </div>

                  {/* Các nút hành động */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setShowCalendar(true);
                      }}
                      className="p-2 rounded-lg bg-orange-200 hover:bg-orange-300 text-orange-800"
                      title="Xem lịch tăng ca"
                    >
                      <CalendarCheck className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setShowSettings(true);
                      }}
                      className="p-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-black"
                      title="Cài đặt nhân viên"
                    >
                      <IdCard className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => removeOvertimeOfDay(m.realName)}
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
<<<<<<< HEAD
                      title="Xóa dữ liệu tăng ca ngày này"
=======
                      title="Xóa dữ liệu tăng ca của nhân viên trong ngày này"
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

<<<<<<< HEAD
                {/* Tóm tắt giờ tăng ca */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <SummaryBox label="Giới hạn" value={formatHours(limit)} />
                  <SummaryBox label="Đã tăng" value={formatHours(done)} />
                  <SummaryBox
                    label="Còn lại"
                    value={formatHours(remaining)}
                    color={remaining === 0 ? "text-red-500" : "text-sky-600"}
                  />
                </div>
              </div>
            );
          })
=======
            {/* 📅 Popup Lịch */}
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

            {/* ⚙️ Popup Cài đặt */}
            {showSettings && selectedMember && (
              <PopupSettings
                member={selectedMember}
                members={members}
                setMembers={setMembers}
                onClose={() => setShowSettings(false)}
              />
            )}
          </>
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
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

<<<<<<< HEAD
      {/* Popup Cài đặt */}
      {showSettings && selectedMember && (
        <PopupSettings
          member={selectedMember}
          members={members}
          setMembers={setMembers}
          onClose={() => setShowSettings(false)}
        />
=======
            <form onSubmit={addMember} className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Tên thực</label>
                <input
                  value={form.realName}
                  onChange={(e) => handleChange("realName", e.target.value)}
                  className="w-full border p-2 rounded mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Biệt danh</label>
                <input
                  value={form.nickname}
                  onChange={(e) => handleChange("nickname", e.target.value)}
                  className="w-full border p-2 rounded mt-1"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Ca</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["Ca ngày", "Ca đêm", "Full ngày", "Full đêm"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleChange("shift", s)}
                      className={`py-2 rounded-lg border ${
                        form.shift === s
                          ? "bg-indigo-50 border-indigo-400"
                          : "border-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Lên ca</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["07:00", "08:00", "19:00", "20:00"].map((time) => {
                    const label = {
                      "07:00": "Sáng sớm",
                      "08:00": "Sáng muộn",
                      "19:00": "Tối sớm",
                      "20:00": "Tối muộn",
                    }[time];
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleChange("shiftStart", time)}
                        className={`flex-1 py-2 rounded-lg border ${
                          form.shiftStart === time
                            ? "bg-yellow-50 border-yellow-400"
                            : "border-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded hover:brightness-110"
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
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
