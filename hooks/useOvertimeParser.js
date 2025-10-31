import { useState } from "react";
import { db } from "../lib/firebase";
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

/**
 * Hook xử lý nhập dữ liệu tăng ca theo text
 * - Mỗi ngày chỉ 1 bản ghi / nhân viên
 * - Nếu ngày đó chưa có -> tạo mới
 * - Nếu có rồi -> update checkIn / checkOut
 */
export default function useOvertimeParser({
  user,
  members = [],
  setMembers,
  setItems,
  selectedMonth,
  selectedYear,
  selectedDate,
}) {
  const [toast, setToast] = useState(null);

  /**
   * 🔹 parseText(rawText)
   *  - rawText: dữ liệu text copy từ bảng chấm công (1 dòng = 1 nhân viên)
   *  - Tự động ghi vào Firestore đúng ngày được chọn
   */
  const parseText = async (rawText) => {
    if (!rawText.trim() || !user) return;

    try {
      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) return;

      const dateObj = selectedDate ? new Date(selectedDate) : new Date();
      const currentDate = dateObj.toISOString().split("T")[0];
      const month = dateObj.getMonth();
      const year = dateObj.getFullYear();

      for (const line of lines) {
        // 👉 Giả định text: "Tên Nick checkIn checkOut"
        const [realName, nickname, checkIn, checkOut] = line.split(/\s+/);

        // 🔍 kiểm tra xem ngày đó đã có record chưa
        const q = query(
          collection(db, "overtimes"),
          where("userId", "==", user.uid),
          where("nickname", "==", nickname),
          where("currentDate", "==", currentDate)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          // ✅ chưa có -> tạo mới record
          await addDoc(collection(db, "overtimes"), {
            userId: user.uid,
            realName: realName || "",
            nickname: nickname || "",
            checkIn: checkIn || "",
            checkOut: checkOut || "",
            currentDate,
            month,
            year,
            createdAt: serverTimestamp(),
          });
          console.log(`🆕 Tạo mới tăng ca cho ${nickname} (${currentDate})`);
        } else {
          // ⚙️ đã có -> cập nhật giờ checkIn/Out
          const docRef = doc(db, "overtimes", snap.docs[0].id);
          await updateDoc(docRef, {
            checkIn: checkIn || snap.docs[0].data().checkIn,
            checkOut: checkOut || snap.docs[0].data().checkOut,
            updatedAt: serverTimestamp(),
          });
          console.log(`🔁 Cập nhật tăng ca ${nickname} (${currentDate})`);
        }
      }

      // 🔄 làm mới danh sách
      const qMonth = query(
        collection(db, "overtimes"),
        where("userId", "==", user.uid),
        where("month", "==", month),
        where("year", "==", year)
      );
      const snapMonth = await getDocs(qMonth);
      const data = snapMonth.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);

      setToast({
        type: "success",
        message: `✅ Đã lưu dữ liệu tăng ca ngày ${currentDate}`,
      });
    } catch (err) {
      console.error(err);
      setToast({
        type: "error",
        message: "❌ Lỗi khi xử lý dữ liệu tăng ca!",
      });
    }
  };

  return { toast, parseText };
}
