import { useState, useRef } from "react";
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
 * Hook xử lý nhập dữ liệu tăng ca (checkin/checkout)
 * - Nếu không tìm thấy nhân viên → báo lỗi
 * - Khi checkout → tự tính giờ OT và cộng vào member.overtimeLimit
 * - Cập nhật thêm lastCheckInTime / lastCheckOutTime cho từng nhân viên
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
  const isProcessing = useRef(false);

  // 🧮 Tính số giờ OT (làm tròn xuống theo giờ)
  const calcOvertimeHours = (shiftStart = "07:00", checkOut) => {
    if (!checkOut) return 0;
    const [sH, sM] = (shiftStart || "07:00").split(":").map(Number);
    const endAdminMinutes = (sH + 9) * 60 + (sM || 0); // hành chính 9h
    const [oH, oM] = checkOut.split(":").map(Number);
    const outMinutes = oH * 60 + (oM || 0);
    const diff = outMinutes - endAdminMinutes;
    if (diff <= 0) return 0;
    if (diff < 60) return 0; // < 1h không tính OT
    return Math.floor(diff / 60);
  };

  const parseText = async (rawText, mode = "checkin") => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    if (!user?.uid) {
      setToast({ type: "error", message: "⚠️ Bạn chưa đăng nhập!" });
      isProcessing.current = false;
      return;
    }

    if (!rawText?.trim()) {
      setToast({ type: "error", message: "⚠️ Chưa nhập dữ liệu chấm công." });
      isProcessing.current = false;
      return;
    }

    try {
      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        setToast({ type: "error", message: "⚠️ Không có dòng hợp lệ nào." });
        isProcessing.current = false;
        return;
      }

      const dateObj = selectedDate ? new Date(selectedDate) : new Date();
      const currentDate = dateObj.toISOString().split("T")[0];
      const month = dateObj.getMonth() + 1;
      const year = dateObj.getFullYear();

      let added = 0,
        updated = 0,
        skipped = 0;
      const missingStaff = [];

      for (const [idx, rawLine] of lines.entries()) {
        let line = rawLine.trim();
        if (/上下班打卡记录/.test(line)) continue; // bỏ dòng tiêu đề

        // Bỏ số thứ tự đầu dòng
        line = line.replace(/^\d+\.\s*/, "").trim();
        const parts = line.split(/[\/\s]+/).filter(Boolean);
        if (parts.length < 2) {
          skipped++;
          continue;
        }

        const realName = parts[0].trim();
        const timePart = parts[1].trim();

        if (timePart === "休") {
          skipped++;
          continue;
        }

        const hourMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
        if (!hourMatch) {
          skipped++;
          continue;
        }

        const timeValue = hourMatch[0];

        // 🔍 Kiểm tra nhân viên có tồn tại không
        const memberMatch = members.find(
          (m) => String(m.realName).trim() === String(realName).trim()
        );

        if (!memberMatch) {
          missingStaff.push(realName);
          skipped++;
          continue;
        }

        // 🔹 Kiểm tra record overtime trong ngày
        const q = query(
          collection(db, "overtimes"),
          where("userId", "==", user.uid),
          where("realName", "==", realName),
          where("currentDate", "==", currentDate)
        );
        const snap = await getDocs(q);

        let overtimeRef;
        if (snap.empty) {
          // ✅ Tạo mới record overtime
          const docRef = await addDoc(collection(db, "overtimes"), {
            userId: user.uid,
            realName,
            nickname: memberMatch.nickname || realName,
            checkIn: mode === "checkin" ? timeValue : "",
            checkOut: mode === "checkout" ? timeValue : "",
            currentDate,
            month,
            year,
            createdAt: serverTimestamp(),
          });
          overtimeRef = docRef;
          added++;
        } else {
          // ✅ Cập nhật record overtime cũ
          const docRef = doc(db, "overtimes", snap.docs[0].id);
          const prev = snap.docs[0].data();
          await updateDoc(docRef, {
            checkIn:
              mode === "checkin"
                ? timeValue || prev.checkIn
                : prev.checkIn || "",
            checkOut:
              mode === "checkout"
                ? timeValue || prev.checkOut
                : prev.checkOut || "",
            updatedAt: serverTimestamp(),
          });
          overtimeRef = docRef;
          updated++;
        }

        // 🔹 Cập nhật dữ liệu sang bảng members (để OverMember hiển thị)
        const memberRef = doc(db, "members", memberMatch.id);
        const updateData = {
          lastCheckInDate: currentDate,
        };

        if (mode === "checkin") {
          updateData.lastCheckInTime = timeValue;
        } else if (mode === "checkout") {
          updateData.lastCheckOutTime = timeValue;

          // ✅ Khi checkout thì tính giờ OT và cộng vào overtimeLimit
          const hours = calcOvertimeHours(
            memberMatch.shiftStart || "07:00",
            timeValue
          );
          const oldLimit = memberMatch.overtimeLimit || {};
          const newWorked = (oldLimit.workedHours || 0) + hours;
          const newRemain = Math.max(
            (oldLimit.monthlyLimit || 0) - newWorked,
            0
          );
          updateData["overtimeLimit.workedHours"] = newWorked;
          updateData["overtimeLimit.remaining"] = newRemain;
        }

        // ✅ Ghi một lần duy nhất
        await updateDoc(memberRef, updateData);
      } // end loop

      // ✅ Hiển thị kết quả
      if (missingStaff.length > 0) {
        setToast({
          type: "error",
          message: `⚠️ Có ${
            missingStaff.length
          } nhân viên chưa có trong danh sách: ${[
            ...new Set(missingStaff),
          ].join(", ")}`,
        });
      } else {
        setToast({
          type: "success",
          message: `✅ Ngày ${currentDate}: ${added} mới, ${updated} cập nhật, ${skipped} bỏ qua.`,
        });
      }
    } catch (err) {
      console.error("🔥 parseText error:", err);
      setToast({
        type: "error",
        message: "❌ Lỗi khi xử lý dữ liệu tăng ca!",
      });
    } finally {
      isProcessing.current = false;
      setTimeout(() => setToast(null), 3500);
    }
  };

  return { toast, parseText };
}
