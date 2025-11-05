// src/hooks/useOvertimeParser.js
import { useState, useRef } from "react";
import { db } from "../lib/firebase";
import dayjs from "dayjs";
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
  const lastToastRef = useRef({ msg: null, ts: 0 });

  const showUniqueToast = (type, message, duration = 6000) => {
    const now = Date.now();
    if (lastToastRef.current.msg === message && now - lastToastRef.current.ts < duration) return;
    lastToastRef.current = { msg: message, ts: now };
    setToast({ type, message });
    setTimeout(() => {
      setToast((cur) => (cur && cur.message === message ? null : cur));
    }, duration);
  };

  const calcOvertimeHours = (shiftStart = "07:00", checkOut) => {
    if (!checkOut) return 0;
    const [sH, sM] = (shiftStart || "07:00").split(":").map(Number);
    const endAdminMinutes = (sH + 9) * 60 + (sM || 0);
    const [oH, oM] = checkOut.split(":").map(Number);
    const outMinutes = oH * 60 + (oM || 0);
    const diff = outMinutes - endAdminMinutes;
    if (diff <= 0 || diff < 60) return 0;
    return Math.floor(diff / 60);
  };

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

      const dateObj = selectedDate ? dayjs(selectedDate) : dayjs();
      const currentDate = dateObj.format("YYYY-MM-DD");
      const month = dateObj.month() + 1;
      const year = dateObj.year();
      // load shiftSchedules for this date (if any) to avoid per-line queries
      const shiftMap = {}; // realName -> {shift, shiftStart}
      const shiftQ = query(collection(db, "shiftSchedules"), where("userId", "==", user.uid), where("date", "==", currentDate));
      const shiftSnap = await getDocs(shiftQ);
      shiftSnap.docs.forEach(d => {
        const data = d.data();
        shiftMap[data.realName] = { shift: data.shift, shiftStart: data.shiftStart };
      });

      let added = 0, updated = 0, skipped = 0;

      const leaveCodes = ["休", "年假", "病假", "事假", "调休", "婚假", "丧假", "产假", "陪产假", "工伤假", "产检假", "哺乳假", "旷工"];

      for (const rawLine of lines) {
        const line = rawLine.replace(/^\d+\.\s*/, "").trim();
        const parts = line.split(/[\/\s]+/).filter(Boolean);
        if (parts.length < 2) { skipped++; continue; }

        const realName = parts[0].trim();
        const timePart = parts[1].trim();

        // 4h half-day
        if (rawLine.includes("4h事假")) {
          const memberMatch = members.find(m => m.realName.trim() === realName);
          if (memberMatch) {
            const q = query(collection(db, "overtimes"), where("userId", "==", user.uid), where("realName", "==", realName), where("currentDate", "==", currentDate));
            const snap = await getDocs(q);
            if (snap.empty) {
              await addDoc(collection(db, "overtimes"), {
                userId: user.uid,
                realName,
                nickname: memberMatch.nickname || realName,
                currentDate,
                month,
                year,
                checkIn: "11:01",
                note: "4h事假",
                hours: 0,
                createdAt: serverTimestamp(),
                shift: (shiftMap[realName]?.shift) || memberMatch.shift || "Ca ngày",
                shiftStart: (shiftMap[realName]?.shiftStart) || memberMatch.shiftStart || "07:00",
              });
            } else {
              const docRef = doc(db, "overtimes", snap.docs[0].id);
              await updateDoc(docRef, { note: "4h事假" });
            }
          }
          continue;
        }

        const isLeave = leaveCodes.some(code => rawLine.includes(code));
        if (isLeave) {
          const memberMatch = members.find(m => m.realName.trim() === realName);
          if (!memberMatch) { skipped++; continue; }
          const q = query(collection(db, "overtimes"), where("userId", "==", user.uid), where("realName", "==", realName), where("currentDate", "==", currentDate));
          const snap = await getDocs(q);
          if (snap.empty) {
            await addDoc(collection(db, "overtimes"), {
              userId: user.uid,
              realName,
              nickname: memberMatch.nickname || realName,
              currentDate,
              month,
              year,
              note: timePart,
              hours: 0,
              createdAt: serverTimestamp(),
              shift: (shiftMap[realName]?.shift) || memberMatch.shift || "Ca ngày",
              shiftStart: (shiftMap[realName]?.shiftStart) || memberMatch.shiftStart || "07:00",
            });
            added++;
          } else {
            const docRef = doc(db, "overtimes", snap.docs[0].id);
            await updateDoc(docRef, { note: timePart, hours: 0, updatedAt: serverTimestamp() });
            updated++;
          }
          continue;
        }

        const hourMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
        if (!hourMatch) { skipped++; continue; }

        const timeValue = hourMatch[0];
        const [h, m] = timeValue.split(":").map(Number);
        const totalMinutes = h * 60 + m;

        const memberMatch = members.find(mb => mb.realName.trim() === realName);
        if (!memberMatch) {
          skipped++;
          showUniqueToast("error", `⚠️ Nhân viên "${realName}" chưa có trong danh sách.`);
          continue;
        }

        // determine shiftStart and shift for this member on this date
        const s = shiftMap[realName];
        const shiftStart = s?.shiftStart || memberMatch.shiftStart || "07:00";
        const shiftName = s?.shift || memberMatch.shift || "Ca ngày";

        const isDayShift = shiftStart === "07:00" || shiftStart === "08:00";
        const isNightShift = shiftStart === "19:00" || shiftStart === "20:00";

        // validate times (simplified)
        if (mode === "checkin") {
          if (isDayShift && !(totalMinutes >= 405 && totalMinutes <= 480)) {
            showUniqueToast("error", `⚠️ ${realName} đang ${shiftName}, giờ ${timeValue} không hợp lệ (06:45–08:00).`);
            skipped++;
            continue;
          }
          if (isNightShift && !(totalMinutes >= 1125 || totalMinutes <= 1200)) {
            showUniqueToast("error", `⚠️ ${realName} đang ${shiftName}, giờ ${timeValue} không hợp lệ (18:45–20:00).`);
            skipped++;
            continue;
          }
        }

        // check-in existence for checkout
        if (mode === "checkin") {
          const qCheck = query(collection(db, "overtimes"), where("userId", "==", user.uid), where("realName", "==", realName), where("currentDate", "==", currentDate));
          const snapCheck = await getDocs(qCheck);
          if (!snapCheck.empty) {
            showUniqueToast("error", `⚠️ ${realName} đã có check-in hôm nay, vui lòng kiểm tra lại.`);
            skipped++;
            continue;
          }
        }

        if (mode === "checkout" && !memberMatch.lastCheckInDate) {
          showUniqueToast("error", `⚠️ ${realName} chưa có check-in hôm nay, không thể check-out.`);
          skipped++;
          continue;
        }

        // save overtime
        const q = query(collection(db, "overtimes"), where("userId", "==", user.uid), where("realName", "==", realName), where("currentDate", "==", currentDate));
        const snap = await getDocs(q);

        let hours = 0;
        if (snap.empty) {
          await addDoc(collection(db, "overtimes"), {
            userId: user.uid,
            realName,
            nickname: memberMatch.nickname || realName,
            shift: shiftName,
            shiftStart,
            checkIn: mode === "checkin" ? timeValue : "",
            checkOut: mode === "checkout" ? timeValue : "",
            currentDate,
            month,
            year,
            hours: 0,
            createdAt: serverTimestamp(),
          });
          added++;
        } else {
          const docRef = doc(db, "overtimes", snap.docs[0].id);
          const prev = snap.docs[0].data();
          const newCheckIn = mode === "checkin" ? timeValue || prev.checkIn : prev.checkIn || "";
          const newCheckOut = mode === "checkout" ? timeValue || prev.checkOut : prev.checkOut || "";
          hours = calcOvertimeHours(shiftStart, newCheckOut);

          await updateDoc(docRef, {
            checkIn: newCheckIn,
            checkOut: newCheckOut,
            hours,
            shift: shiftName,
            shiftStart,
            updatedAt: serverTimestamp(),
          });
          updated++;

          if (mode === "checkout" && hours > 0) {
            const memberRef = doc(db, "members", memberMatch.id);
            const oldWorked = memberMatch.overtimeLimit?.workedHours || 0;
            const newWorked = oldWorked + hours;
            const monthlyLimit = memberMatch.overtimeLimit?.monthlyLimit || 0;
            const remaining = Math.max(monthlyLimit - newWorked, 0);
            await updateDoc(memberRef, { "overtimeLimit.workedHours": newWorked, "overtimeLimit.remaining": remaining });
            setMembers?.((prev) => prev.map(m => m.id === memberMatch.id ? { ...m, overtimeLimit: { ...m.overtimeLimit, workedHours: newWorked, remaining } } : m));
          }
        }

        const memberRef = doc(db, "members", memberMatch.id);
        const updateData = { lastCheckInDate: currentDate };
        if (mode === "checkin") updateData.lastCheckInTime = timeValue;
        else if (mode === "checkout") updateData.lastCheckOutTime = timeValue;
        await updateDoc(memberRef, updateData);
      }

      showUniqueToast("success", `✅ Ngày ${currentDate}: ${added} mới, ${updated} cập nhật, ${skipped} bỏ qua.`, 6000);
    } catch (err) {
      console.error("🔥 parseText error:", err);
      showUniqueToast("error", "❌ Lỗi khi xử lý dữ liệu tăng ca!", 6000);
    } finally {
      isProcessing.current = false;
    }
  };

  return { toast, parseText };
}
