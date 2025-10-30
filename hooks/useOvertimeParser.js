// hooks/useOvertimeParser.js
import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function useOvertimeParser({ user, parentMembers, setParentMembers }) {
  const [toast, setToast] = useState({ message: "", type: "info" });
  const [newStaffDetected, setNewStaffDetected] = useState([]);

  const showToast = (msg, type = "info") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: "", type: "info" }), 3000);
  };

  const handleExistingMemberCheckIn = (memberId, time) => {
    setParentMembers((prev) => {
      const updated = prev.map((m) =>
        m.id === memberId ? { ...m, checkIn: time } : m
      );
      return updated;
    });
  };

  // ====== HÀM XỬ LÝ CHẤM CÔNG ======
  const parseText = async (text, mode = "checkin") => {
    setNewStaffDetected([]);
    if (!user) return showToast("⚠️ Bạn chưa đăng nhập", "error");
    if (!text.trim()) return showToast("⚠️ Dán dữ liệu chấm công trước", "error");

    const q = query(collection(db, "members"), where("userId", "==", user.uid));
    const snap = await getDocs(q);
    const existingMembers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const updatedList = [];
    const newDetected = [];
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    const normalize = (str) => str.trim().normalize("NFC");

    for (let line of lines) {
      if (/休|事假|年假|phép|việc riêng/.test(line)) continue;
      const match = line.match(/\d+\.\s*([\p{L}\p{M}\s]+)\/\s*([\d:]+)/u);
      if (!match) continue;

      let [, name, time] = match;
      name = normalize(name);
      const [hour] = time.split(":").map(Number);
      const existing = existingMembers.find((m) => normalize(m.realName) === name);

      if (!existing) {
        newDetected.push({ realName: name, checkIn: time });
        continue;
      }

      const isCheckin = mode === "checkin";
      if (isCheckin && hour >= 12) {
        showToast(`⚠️ ${name}: ${time} có vẻ là giờ xuống ca`, "error");
        continue;
      }
      if (!isCheckin && hour < 12) {
        showToast(`⚠️ ${name}: ${time} có vẻ là giờ lên ca`, "error");
        continue;
      }

      // ===== CHECK-IN =====
      if (isCheckin) {
        handleExistingMemberCheckIn(existing.id, time);
        await updateDoc(doc(db, "members", existing.id), {
          checkIn: time,
          currentDate: dateString,
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

      // ===== CHECK-OUT =====
      else {
        const q3 = query(
          collection(db, "overtimes"),
          where("userId", "==", user.uid),
          where("memberId", "==", existing.id),
          where("date", "==", dateString)
        );
        const snap3 = await getDocs(q3);
        if (snap3.empty) {
          showToast(`⚠️ ${name}: Chưa có giờ lên ca`, "error");
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

    // ===== HIỂN THỊ KẾT QUẢ =====
    if (updatedList.length > 0) {
      showToast(
        `${mode === "checkin" ? "✅ Lên ca" : "🔵 Xuống ca"}: ${updatedList.length} nhân viên`,
        "success"
      );
    } else if (newDetected.length > 0) {
      showToast(`🆕 Phát hiện ${newDetected.length} nhân viên mới`, "info");
      setNewStaffDetected(
        newDetected.map((p, i) => ({
          id: `new-${i}`,
          realName: p.realName,
          nickname: p.realName.charAt(0),
          shift: "Ca ngày",
          shiftStart: "07:00",
          selected: true,
          checkIn: p.checkIn,
        }))
      );
    } else {
      showToast("⚠️ Không phát hiện nhân viên nào cần xử lý", "warning");
    }
  };

  // ===== THÊM NHÂN VIÊN MỚI =====
  const addNewStaffConfirmed = async () => {
    if (!user) return showToast("⚠️ Bạn chưa đăng nhập", "error");
    const selected = newStaffDetected.filter((s) => s.selected);
    if (!selected.length) return showToast("Chưa chọn nhân viên nào", "error");

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
      setParentMembers((prev) => [...prev, ...added]);
      showToast(`Đã thêm ${added.length} nhân viên mới`, "success");
    }

    setNewStaffDetected([]);
  };

  return {
    toast,
    newStaffDetected,
    setNewStaffDetected,
    parseText,
    addNewStaffConfirmed,
  };
}
