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

        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

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
    // ... giữ nguyên code của bạn
  };

  const handleDeleteAll = async () => {
    // ... giữ nguyên code của bạn
  };

  const showPopup = (msg, type) => {
    setPopupMsg(msg);
    setPopupType(type);
    setTimeout(() => setPopupMsg(null), 2500);
  };

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

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
          handleDeleteAll={handleDeleteAll}
          loading={loading}
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
        />
      </div>
    </div>
  );
}
