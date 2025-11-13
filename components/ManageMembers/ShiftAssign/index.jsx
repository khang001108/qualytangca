// components/ManageMembers/ShiftAssign/index.jsx
import React, { useRef, useState, useEffect } from "react";
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

import ShiftAssignHeader from "./ShiftAssignHeader";
import ShiftAssignShiftSelector from "./ShiftAssignShiftSelector";
import ShiftAssignCalendar from "./ShiftAssignCalendar";
import ShiftAssignFooter from "./ShiftAssignFooter";

export default function ShiftAssign(props) {
  const {
    user,
    members = [],
    onCancel,
    onSuccess,
    onStatusChange,
    selectedMonth,
    selectedYear,
  } = props;

  // ===== giữ nguyên toàn bộ logic từ file gốc =====
  const ref = useRef();
  const [loading, setLoading] = useState(false);
  const [shiftType, setShiftType] = useState("day");
  const [assignMap, setAssignMap] = useState({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [popupMsg, setPopupMsg] = useState(null);
  const [popupType, setPopupType] = useState("success");

  const assignMapRef = useRef(assignMap);
  useEffect(() => {
    assignMapRef.current = assignMap;
  }, [assignMap]);

  const dragState = useRef({
    isSelecting: false,
    selectingShift: null,
    dragged: false,
    pressDay: null,
    startX: 0,
    startY: 0,
  });

  // khi mở lại poppup rst trạng thái
  // useEffect(() => {
  //   setLoading(false);
  // }, [selectedMonth, selectedYear, onCancel]);

  // reset + load logic như file gốc…
  useEffect(() => {
    if (!user?.uid) return;
    setHasLoaded(false);
    setAssignMap({});
  }, [selectedMonth, selectedYear, user?.uid]);

  useEffect(() => {
    if (!user?.uid || hasLoaded) return;
    (async () => {
      try {
        const col = collection(db, "shiftSchedules");
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();

        const startDate = `${selectedYear}-${String(selectedMonth).padStart(
          2,
          "0"
        )}-01`;
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(
          2,
          "0"
        )}-${String(lastDay).padStart(2, "0")}`;

        const qShift = query(
          col,
          where("userId", "==", user.uid),
          where("date", ">=", startDate),
          where("date", "<=", endDate)
        );

        const snap = await getDocs(qShift);
        const newMap = {};

        snap.docs.forEach((d) => {
          const data = d.data();
          const day = Number(data.date.split("-")[2]);
          newMap[day] = data.shift.includes("đêm") ? "night" : "day";
        });

        setAssignMap(newMap);
        setHasLoaded(true);
      } catch (err) {
        console.error("❌ Lỗi khi load phân ca:", err);
      }
    })();
  }, [user?.uid, selectedMonth, selectedYear, hasLoaded]);

  // xử lý chọn ô – giữ nguyên logic gốc
  const handleMouseDown = (day, e) => {
    if (loading) return;
    e.preventDefault();
    e.stopPropagation();

    dragState.current.isSelecting = true;
    dragState.current.selectingShift = shiftType;
    dragState.current.dragged = false;
    dragState.current.pressDay = day;
    dragState.current.startX = e.clientX;
    dragState.current.startY = e.clientY;

    setAssignMap((prev) => {
      const cur = prev[day] ?? null;
      let next = null;
      if (shiftType === "day") next = cur === "day" ? null : "day";
      else next = cur === "night" ? null : "night";
      return { ...prev, [day]: next };
    });

    const onMove = (ev) => {
      const dx = Math.abs(ev.clientX - dragState.current.startX);
      const dy = Math.abs(ev.clientY - dragState.current.startY);
      if (dx > 3 || dy > 3) dragState.current.dragged = true;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      dragState.current.isSelecting = false;
      dragState.current.dragged = false;
      dragState.current.pressDay = null;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const handleMouseEnter = (day) => {
    if (!dragState.current.isSelecting || loading) return;
    dragState.current.dragged = true;
    setAssignMap((prev) => ({
      ...prev,
      [day]: dragState.current.selectingShift,
    }));
  };

  // lưu + xóa logic cũng giữ nguyên như bản cũ…
  const handleApply = async () => {
    if (!user?.uid) return;
    const selectedDays = Object.keys(assignMap).filter((d) => assignMap[d]);
    if (selectedDays.length === 0)
      return showPopup("⚠️ Chưa chọn ngày nào để lưu!", "error");

    setLoading(true);
    onStatusChange?.({ loading: true }); // 👈 báo bắt đầu loading
    try {
      for (const dayStr of selectedDays) {
        const type = assignMap[dayStr];
        const shift = type === "day" ? "Ca ngày" : "Ca đêm";
        const date = `${selectedYear}-${String(selectedMonth).padStart(
          2,
          "0"
        )}-${String(dayStr).padStart(2, "0")}`;

        for (const m of members) {
          if (!m?.realName) continue;
          const shiftStart =
            type === "day"
              ? m.earlyShift
                ? "07:00"
                : "08:00"
              : m.earlyShift
              ? "19:00"
              : "20:00";
          const safeName = m.realName.replace(/[\/\\.#$[\]]/g, "_");
          const docId = `${user.uid}_${safeName}_${date}`;

          await setDoc(doc(db, "shiftSchedules", docId), {
            userId: user.uid,
            realName: m.realName,
            memberId: m.id,
            date,
            shift,
            shiftStart,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          const memberRef = doc(db, "members", m.id);
          await updateDoc(memberRef, {
            shift,
            shiftStart,
            updatedAt: serverTimestamp(),
          });
        }
      }

      showPopup("✅ Đã lưu phân ca và đồng bộ thành công!", "success");
      onStatusChange?.({
        loading: false,
        success: true,
        month: selectedMonth,
      }); // 👈 báo thành công
      onSuccess?.();
    } catch (err) {
      console.error("🔥 Lỗi lưu phân ca:", err);
      showPopup("❌ Không thể lưu phân ca!", "error");
      onStatusChange?.({ loading: false, success: false });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("⚠️ Xóa toàn bộ phân ca tháng này?")) return;
    setLoading(true);
    try {
      const col = collection(db, "shiftSchedules");
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(
        2,
        "0"
      )}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(
        2,
        "0"
      )}-${String(lastDay).padStart(2, "0")}`;
      const qShift = query(
        col,
        where("userId", "==", user.uid),
        where("date", ">=", startDate),
        where("date", "<=", endDate)
      );
      const snap = await getDocs(qShift);
      for (const d of snap.docs)
        await deleteDoc(doc(db, "shiftSchedules", d.id));

      // ✅ Đặt lại ca mặc định cho tất cả members
      for (const m of members) {
        const memberRef = doc(db, "members", m.id);
        await updateDoc(memberRef, {
          shift: "Ca ngày",
          shiftStart: "08:00",
          updatedAt: serverTimestamp(),
        });
      }

      setAssignMap({});
      showPopup("🗑️ Đã xóa toàn bộ phân ca và reset ca mặc định!", "success");
    } catch (err) {
      console.error("🔥 Lỗi khi xóa phân ca:", err);
      showPopup("❌ Không thể xóa phân ca!", "error");
    } finally {
      setLoading(false);
    }
  };

  const showPopup = (msg, type) => {
    setPopupMsg(msg);
    setPopupType(type);
    setTimeout(() => setPopupMsg(null), 2500);
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const totalDayShift = Object.values(assignMap).filter(
    (v) => v === "day"
  ).length;
  const totalNightShift = Object.values(assignMap).filter(
    (v) => v === "night"
  ).length;

  // ===================== RETURN UI =========================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        ref.current && !ref.current.contains(e.target) && onCancel()
      }
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        ref={ref}
        className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 
        w-11/12 max-w-lg p-6 rounded-2xl shadow-2xl border border-gray-200 
        dark:border-gray-700 z-10 select-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ShiftAssignHeader
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onClose={onCancel}
        />

        {popupMsg && (
          <div
            className={`mb-4 text-center text-sm px-4 py-2 rounded-lg ${
              popupType === "success"
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {popupMsg}
          </div>
        )}

        <ShiftAssignShiftSelector
          shiftType={shiftType}
          setShiftType={setShiftType}
          loading={loading}
        />

        {/* Tổng số ngày đã chọn */}
        <div
          className="
  flex justify-center gap-6 mt-2 mb-4 
  text-sm font-medium 
  text-gray-700 dark:text-gray-300
"
        >
          <span className="flex items-center gap-1">
            ☀️ <span className="font-semibold">{totalDayShift}</span> ngày
          </span>

          <span className="opacity-50">•</span>

          <span className="flex items-center gap-1">
            🌙 <span className="font-semibold">{totalNightShift}</span> ngày
          </span>
        </div>

        <ShiftAssignCalendar
          daysInMonth={daysInMonth}
          assignMap={assignMap}
          handleMouseDown={handleMouseDown}
          handleMouseEnter={handleMouseEnter}
          loading={loading}
        />

        <ShiftAssignFooter
          loading={loading}
          onCancel={onCancel}
          handleApply={handleApply}
          handleDeleteAll={handleDeleteAll}
        />
      </div>
    </div>
  );
}
