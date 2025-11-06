import { useState, useRef } from "react";
import dayjs from "dayjs";
import { showUniqueToastFactory } from "./utilsToast";
import { calcOvertimeHours } from "./calcOvertime";
import {
  getShiftMap,
  saveOvertimeRecord,
  updateMemberOvertime,
} from "./firestoreOps";
import { parseLine, LEAVE_CODES } from "./parseHelpers";

export default function useOvertimeParser({
  user,
  members = [],
  setMembers,
  selectedDate,
}) {
  const [toast, setToast] = useState(null);
  const isProcessing = useRef(false);
  const showUniqueToast = showUniqueToastFactory(setToast);

  const parseText = async (rawText, mode = "checkin") => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    if (!user?.uid) {
      showUniqueToast("error", "⚠️ Bạn chưa đăng nhập!");
      isProcessing.current = false;
      return;
    }

    if (!rawText?.trim()) {
      showUniqueToast("error", "⚠️ Chưa nhập dữ liệu chấm công.");
      isProcessing.current = false;
      return;
    }

    try {
      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !/上下班打卡记录/.test(l));

      const currentDate = dayjs(selectedDate || new Date()).format("YYYY-MM-DD");
      const { shiftMap } = await getShiftMap(user.uid, currentDate);

      let added = 0,
        updated = 0,
        skipped = 0;

      for (const rawLine of lines) {
        const { realName, timePart } = parseLine(rawLine);
        if (!realName || !timePart) continue;

        const member = members.find((m) => m.realName.trim() === realName);
        if (!member) {
          skipped++;
          showUniqueToast("error", `⚠️ Nhân viên "${realName}" chưa có trong danh sách.`);
          continue;
        }

        // nghỉ phép, nghỉ 4h
        if (LEAVE_CODES.some((code) => rawLine.includes(code))) {
          await saveOvertimeRecord(user, member, currentDate, { note: timePart });
          continue;
        }

        const shift = shiftMap[realName] || {
          shift: member.shift,
          shiftStart: member.shiftStart,
        };

        const checkTime = timePart.match(/^(\d{1,2}):(\d{2})$/)?.[0];
        if (!checkTime) continue;

        const result = await saveOvertimeRecord(user, member, currentDate, {
          shift,
          checkTime,
          mode,
          calcOvertimeHours,
        });

        added += result.added;
        updated += result.updated;
        skipped += result.skipped;

        if (result.newHours > 0 && mode === "checkout") {
          await updateMemberOvertime(member, result.newHours, setMembers);
        }
      }

      showUniqueToast(
        "success",
        `✅ ${currentDate}: ${added} mới, ${updated} cập nhật, ${skipped} bỏ qua.`,
        6000
      );
    } catch (err) {
      console.error("🔥 parseText error:", err);
      showUniqueToast("error", "❌ Lỗi khi xử lý dữ liệu tăng ca!");
    } finally {
      isProcessing.current = false;
    }
  };

  return { toast, parseText };
}
