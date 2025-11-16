// hooks/useOvertimeParser/index.js
// (Bản mới hoàn chỉnh: parser chỉ update shiftSchedules theo ngày)

import { useState, useRef } from "react";
import dayjs from "dayjs";
import { showUniqueToastFactory } from "./utilsToast";
import { parseLine, LEAVE_CODES } from "./parseHelpers";
import { s2t } from "chinese-conv";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function useOvertimeParser({
  user,
  members = [],
  setMembers,
  selectedDate,
}) {
  const [toast, setToast] = useState(null);
  const isProcessing = useRef(false);
  const showToast = showUniqueToastFactory(setToast);

  const parseText = async (rawText, mode = "checkin") => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    if (!user?.uid) {
      showToast("error", "⚠️ Bạn chưa đăng nhập!");
      isProcessing.current = false;
      return;
    }

    if (!rawText?.trim()) {
      showToast("error", "⚠️ Chưa nhập dữ liệu chấm công.");
      isProcessing.current = false;
      return;
    }

    try {
      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !/上下班打卡记录/.test(l));

      const currentDate = dayjs(selectedDate || new Date()).format("YYYY-MM-DD");

      let added = 0,
        updated = 0,
        skipped = 0;

      for (const raw of lines) {
        const { realName, timePart } = parseLine(raw);
        if (!realName || !timePart) continue;

        // Chuyển giản thể → phồn thể
        const normalizedName = s2t(realName.trim());

        // Tìm nhân viên
        const member = members.find(
          (m) => m.realName.trim() === normalizedName
        );

        if (!member) {
          skipped++;
          showToast(
            "error",
            `⚠️ Nhân viên "${normalizedName}" chưa có trong danh sách.`
          );
          continue;
        }

        // Là nghỉ phép → chỉ lưu note
        if (LEAVE_CODES.some((code) => raw.includes(code))) {
          const docId = `${currentDate}__${member.id}`;
          await setDoc(
            doc(db, "shiftSchedules", docId),
            {
              userId: user.uid,
              date: currentDate,
              memberId: member.id,
              realName: member.realName,
              nickname: member.nickname || "",
              note: timePart,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          updated++;
          continue;
        }

        // Lấy giờ
        const clean = timePart.trim();
        const checkTime = clean.match(/^(\d{1,2}):(\d{2})$/)?.[0];
        if (!checkTime) continue;

        // Document cho ngày + memberId
        const docId = `${currentDate}__${member.id}`;
        const ref = doc(db, "shiftSchedules", docId);

        const snap = await getDoc(ref);
        const old = snap.exists() ? snap.data() : {};

        // SHIFT — ưu tiên từ shiftSchedules nếu có
        const shift = {
          shift: old.shift || member.shift || "Ca ngày",
          shiftStart: old.shiftStart || member.shiftStart || "08:00",
        };

        const newData = {
          userId: user.uid,
          date: currentDate,
          memberId: member.id,
          realName: member.realName,
          nickname: member.nickname || "",
          shift: shift.shift,
          shiftStart: shift.shiftStart,
          lenCa: old.lenCa || null,
          xuongCa: old.xuongCa || null,
          updatedAt: serverTimestamp(),
        };

        if (mode === "checkin") newData.lenCa = checkTime;
        if (mode === "checkout") newData.xuongCa = checkTime;

        await setDoc(ref, newData, { merge: true });

        snap.exists() ? updated++ : added++;
      }

      showToast(
        "success",
        `✅ Đã xử lý: ${added} mới, ${updated} cập nhật, ${skipped} bỏ qua.`,
        5000
      );
    } catch (err) {
      console.error("🔥 Lỗi parser:", err);
      showToast("error", "❌ Lỗi xử lý dữ liệu!");
    } finally {
      isProcessing.current = false;
    }
  };

  return { toast, parseText };
}
