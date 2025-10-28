// components/OvertimeForm.js
import { useState, useRef, useEffect } from "react";
import { db } from "../lib/firebase";
import { CirclePlus, Edit2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore"; // ⬅️ thêm import này ở đầu file
import Toast from "./Toast";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export default function OvertimeForm({
  user,
  members: parentMembers = [],
  setMembers: setParentMembers,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [dayText, setDayText] = useState("");
  const [nightText, setNightText] = useState("");
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [newStaffDetected, setNewStaffDetected] = useState([]);
  const [members, setMembers] = useState(parentMembers || []);
  const modalRef = useRef();

  useEffect(() => {
    setMembers(parentMembers);
  }, [parentMembers]);

  useEffect(() => {
    const closeOnEsc = (e) => e.key === "Escape" && setFormOpen(false);
    document.addEventListener("keydown", closeOnEsc);
    return () => document.removeEventListener("keydown", closeOnEsc);
  }, []);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "info" }), 3000);
  };

  // Cập nhật giờ check-in cho member đã có
  const handleExistingMemberCheckIn = (memberId, time) => {
    setMembers((prev) => {
      const updated = prev.map((m) =>
        m.id === memberId ? { ...m, checkIn: time } : m
      );
      setParentMembers && setParentMembers(updated);
      return updated;
    });
  };

  // Hàm xử lý text chấm công
  const parseText = async (text, mode = "checkin") => {
    setNewStaffDetected([]); // 🔹 clear cũ
    if (!user) return alert("Vui lòng đăng nhập");
    if (!text.trim()) return showToast("Dán dữ liệu chấm công trước", "error");

    const q = query(collection(db, "members"), where("userId", "==", user.uid));
    const snap = await getDocs(q);
    const existingMembers = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const updatedList = [];
    const newDetected = [];
    const skippedList = [];
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    const normalize = (str) => str.trim().normalize("NFC");

    for (let line of lines) {
      if (/休|事假|年假|phép|việc riêng/.test(line)) continue;
      const match = line.match(/\d+\.\s*([\p{L}\p{M}\s]+)\/\s*([\d:]+)/u);
      if (!match) {
        skippedList.push(line);
        continue;
      }

      let [, name, time] = match;
      name = normalize(name);
      const [hour, minute] = time.split(":").map(Number);

      const existing = existingMembers.find(
        (m) => normalize(m.realName) === name
      );

      if (!existing) {
        newDetected.push({ realName: name, checkIn: time });
        continue;
      }

      // ⚙️ Kiểm tra giờ hợp lệ cho từng chế độ
      const isCheckin = mode === "checkin";
      if (isCheckin && hour >= 12) {
        showToast(`⚠️ ${name}: ${time} có vẻ là giờ xuống ca, không thể lên ca!`, "error");
        continue;
      }
      if (!isCheckin && hour < 12) {
        showToast(`⚠️ ${name}: ${time} có vẻ là giờ lên ca, không thể xuống ca!`, "error");
        continue;
      }

      // ✅ Nếu là checkin
      if (isCheckin) {
        handleExistingMemberCheckIn(existing.id, time);
        await updateDoc(doc(db, "members", existing.id), {
          checkIn: time,
          currentDate: dateString, // "2025-10-28"
        });

        const q2 = query(
          collection(db, "overtimes"),
          where("userId", "==", user.uid),
          where("memberId", "==", existing.id),
          where("date", "==", dateString)
        );
        const snap2 = await getDocs(q2);
        if (snap2.empty) {
          await addDoc(collection(db, "overtimes"), {
            userId: user.uid,
            memberId: existing.id,
            date: dateString,
            checkIn: time,
            createdAt: serverTimestamp(),
          });
        }
        updatedList.push(`${existing.realName} (${time})`);
      }

      // ✅ Nếu là checkout
      else {
        const q3 = query(
          collection(db, "overtimes"),
          where("userId", "==", user.uid),
          where("memberId", "==", existing.id),
          where("date", "==", dateString)
        );
        const snap3 = await getDocs(q3);
        if (snap3.empty) {
          showToast(`⚠️ ${name}: Chưa có giờ lên ca, không thể xuống ca!`, "error");
          continue;
        }
        const overtimeDoc = snap3.docs[0];
        await updateDoc(doc(db, "overtimes", overtimeDoc.id), {
          checkOut: time,
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "members", existing.id), { checkOut: time });
        updatedList.push(`${existing.realName} (${time})`);
      }
    }

    if (updatedList.length > 0) {
      showToast(
        `${mode === "checkin" ? "✅ Đã cập nhật giờ lên ca cho" : "🔵 Đã cập nhật giờ xuống ca cho"} ${updatedList.length} nhân viên:\n${updatedList.join(", ")}`,
        "success"
      );
    }
    else if (newDetected.length > 0) {
      showToast(`🆕 Phát hiện ${newDetected.length} nhân viên mới`, "info");

      setNewStaffDetected(
        newDetected.map((p, i) => {
          const [h, m] = (p.checkIn || "07:00").split(":").map(Number);
          const minutes = h * 60 + (m || 0);
          let shiftStart = "07:00";
          let shift = "Ca ngày";

          // 🔹 Ca ngày sớm
          if (minutes >= 405 && minutes <= 420) { // 6:45 → 7:00
            shiftStart = "07:00";
            shift = "Ca ngày";
          }
          // 🔹 Ca ngày muộn
          else if (minutes >= 465 && minutes <= 480) { // 7:45 → 8:00
            shiftStart = "08:00";
            shift = "Ca ngày";
          }
          // 🔹 Ca đêm sớm
          else if (minutes >= 1125 && minutes <= 1140) { // 18:45 → 19:00
            shiftStart = "19:00";
            shift = "Ca đêm";
          }
          // 🔹 Ca đêm muộn
          else if (minutes >= 1185 && minutes <= 1200) { // 19:45 → 20:00
            shiftStart = "20:00";
            shift = "Ca đêm";
          }

          return {
            id: `new-${i}`,
            realName: p.realName,
            nickname: p.realName.charAt(0),
            shift,
            shiftStart,
            selected: true,
            checkIn: p.checkIn || "",
          };
        })
      );
    }

    else {
      showToast("⚠️ Không phát hiện nhân viên nào cần xử lý", "warning");
    }
  };



  // Thêm nhân viên mới vào Firestore
  const addNewStaffConfirmed = async () => {
    if (!user) return alert("Vui lòng đăng nhập");
    const selected = newStaffDetected.filter((s) => s.selected);
    if (!selected.length)
      return showToast("Chưa chọn nhân viên nào", "error");

    const added = [];
    for (let s of selected) {
      try {
        const ref = await addDoc(collection(db, "members"), {
          userId: user.uid,
          realName: s.realName,
          nickname: s.nickname,
          shift: s.shift,
          shiftStart: s.shiftStart,
          createdAt: serverTimestamp(),
          overtimeLimit: {},
        });
        added.push({ id: ref.id, ...s });
      } catch (err) {
        console.error("Lỗi thêm nhân viên:", err);
      }
    }

    if (added.length > 0) {
      setMembers((prev) => {
        const updated = [...prev, ...added];
        setParentMembers && setParentMembers(updated);
        return updated;
      });
      showToast(`Đã thêm ${added.length} nhân viên mới`, "success");
    }

    setNewStaffDetected([]);
  };

  return (
    <>
      {toast.message && <Toast message={toast.message} type={toast.type} />}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg"
        >
          <CirclePlus className="w-5 h-5" /> Thêm tăng ca
        </button>
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onMouseDown={(e) =>
            modalRef.current &&
            !modalRef.current.contains(e.target) &&
            setFormOpen(false)
          }
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            ref={modalRef}
            className="relative bg-white w-11/12 max-w-xl p-6 rounded-xl shadow-2xl z-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Thêm tăng ca</h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">
                  Dán chấm công Ca ngày
                </label>
                <textarea
                  rows={4}
                  className="w-full border p-2 rounded mt-1"
                  value={dayText}
                  onChange={(e) => setDayText(e.target.value)}
                  placeholder="Dán dữ liệu chấm công ca ngày..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => parseText(dayText, "checkin")}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:brightness-110"
                  >
                    Lên ca (Check-in)
                  </button>

                  <button
                    type="button"
                    onClick={() => parseText(dayText, "checkout")}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:brightness-110"
                  >
                    Xuống ca (Check-out)
                  </button>
                </div>

              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Dán chấm công Ca đêm
                </label>
                <textarea
                  rows={4}
                  className="w-full border p-2 rounded mt-1"
                  value={nightText}
                  onChange={(e) => setNightText(e.target.value)}
                  placeholder="Dán dữ liệu chấm công ca đêm..."
                />
                <button
                  type="button"
                  onClick={() => parseText(nightText)}
                  className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:brightness-110"
                >
                  Xử lý Ca đêm
                </button>
              </div>

              {newStaffDetected.length > 0 && (
                <div className="border border-gray-300 rounded p-3 mt-3 max-h-96 overflow-y-auto">
                  <h4 className="font-semibold mb-2">Nhân viên mới phát hiện</h4>
                  {newStaffDetected.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 border-b border-gray-200 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={s.selected}
                        onChange={(e) =>
                          setNewStaffDetected((prev) =>
                            prev.map((m) =>
                              m.id === s.id
                                ? { ...m, selected: e.target.checked }
                                : m
                            )
                          )
                        }
                      />
                      <span className="flex-1">{s.realName}</span>
                      <input
                        className="w-14 border rounded px-1 text-sm"
                        value={s.nickname}
                        onChange={(e) =>
                          setNewStaffDetected((prev) =>
                            prev.map((m) =>
                              m.id === s.id
                                ? { ...m, nickname: e.target.value }
                                : m
                            )
                          )
                        }
                      />
                      <select
                        className="border rounded px-1 text-sm"
                        value={s.shift}
                        onChange={(e) =>
                          setNewStaffDetected((prev) =>
                            prev.map((m) =>
                              m.id === s.id
                                ? { ...m, shift: e.target.value }
                                : m
                            )
                          )
                        }
                      >
                        <option value="Ca ngày">Ca ngày</option>
                        <option value="Ca đêm">Ca đêm</option>
                      </select>
                      <select
                        className="border rounded px-1 text-sm"
                        value={s.shiftStart}
                        onChange={(e) =>
                          setNewStaffDetected((prev) =>
                            prev.map((m) =>
                              m.id === s.id
                                ? { ...m, shiftStart: e.target.value }
                                : m
                            )
                          )
                        }
                      >
                        <option value="07:00">07:00</option>
                        <option value="08:00">08:00</option>
                        <option value="19:00">19:00</option>
                        <option value="20:00">20:00</option>
                      </select>
                      <span className="text-xs text-gray-500">{s.checkIn}</span>
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                      onClick={() => setNewStaffDetected([])}
                    >
                      Hủy
                    </button>
                    <button
                      className="bg-green-500 text-white px-4 py-2 rounded hover:brightness-110"
                      onClick={addNewStaffConfirmed}
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
