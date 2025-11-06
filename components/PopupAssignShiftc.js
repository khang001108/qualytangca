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
import { db } from "../lib/firebase";
import { Loader2, Trash2 } from "lucide-react";

export default function PopupAssignShift({
  user,
  members = [],
  onCancel,
  onSuccess,
  selectedMonth,
  selectedYear,
}) {
  const ref = useRef();
  const [loading, setLoading] = useState(false);
  const [shiftType, setShiftType] = useState("day");
  const [assignMap, setAssignMap] = useState({});
  const [hasLoaded, setHasLoaded] = useState(false);

  const dragState = useRef({
    isSelecting: false,
    selectingShift: null,
    dragged: false,
    pressDay: null,
  });

  // 🔹 Load dữ liệu phân ca khi mở
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
          if (!newMap[day])
            newMap[day] = data.shift.includes("đêm") ? "night" : "day";
        });

        setAssignMap(newMap);
        setHasLoaded(true);
      } catch (err) {
        console.error("❌ Lỗi khi load phân ca:", err);
      }
    })();
  }, [user?.uid, selectedMonth, selectedYear, hasLoaded]);

  // ----- handlers -----
  const handleMouseDown = (day, e) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current.isSelecting = true;
    dragState.current.selectingShift = shiftType;
    dragState.current.dragged = false;
    dragState.current.pressDay = day;

    const onGlobalMouseUp = () => {
      dragState.current.isSelecting = false;
      dragState.current.selectingShift = null;
      dragState.current.dragged = false;
      dragState.current.pressDay = null;
      document.removeEventListener("mouseup", onGlobalMouseUp);
    };
    document.addEventListener("mouseup", onGlobalMouseUp);
  };

  const handleMouseEnter = (day) => {
    if (!dragState.current.isSelecting || !dragState.current.selectingShift)
      return;

    setAssignMap((prev) => ({
      ...prev,
      [day]: dragState.current.selectingShift,
    }));
  };

  const handleMouseUp = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const pressDay = dragState.current.pressDay;
    dragState.current.isSelecting = false;
    dragState.current.selectingShift = null;
    dragState.current.dragged = false;
    dragState.current.pressDay = null;

    if (!pressDay) return;

    // Toggle day/night
    setAssignMap((prev) => {
      const cur = prev[pressDay] ?? null;
      let next = null;
      if (shiftType === "day") {
        next = cur === "day" ? "night" : cur === "night" ? null : "day";
      } else {
        next = cur === "night" ? "day" : cur === "day" ? null : "night";
      }
      return { ...prev, [pressDay]: next };
    });
  };

  // 🔹 Lưu phân ca
  const handleApply = async () => {
    if (!user?.uid) return alert("⚠️ Không có thông tin người dùng!");
    const selectedDays = Object.keys(assignMap).filter((d) => assignMap[d]);
    if (selectedDays.length === 0)
      return alert("⚠️ Chưa chọn ngày nào để lưu!");

    if (
      !window.confirm(`Xác nhận lưu phân ca cho ${selectedDays.length} ngày?`)
    )
      return;

    setLoading(true);
    try {
      const year = selectedYear;
      const month = selectedMonth;

      for (const dayStr of selectedDays) {
        const type = assignMap[dayStr];
        if (!type) continue;

        const shift = type === "day" ? "Ca ngày" : "Ca đêm";
        const date = `${year}-${String(month).padStart(2, "0")}-${String(dayStr).padStart(2, "0")}`;

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
          });
        }
      }

      // đồng bộ lại shift trong members
      const lastDay = Math.max(...selectedDays.map(Number));
      const lastType = assignMap[lastDay];
      const newShift = lastType === "night" ? "Ca đêm" : "Ca ngày";
      for (const m of members) {
        if (!m?.id) continue;
        const newShiftStart =
          newShift === "Ca ngày"
            ? m.earlyShift
              ? "07:00"
              : "08:00"
            : m.earlyShift
            ? "19:00"
            : "20:00";
        await updateDoc(doc(db, "members", m.id), {
          shift: newShift,
          shiftStart: newShiftStart,
        });
      }

      alert("✅ Đã lưu phân ca thành công!");
      onSuccess?.();
    } catch (err) {
      console.error("🔥 Lỗi lưu phân ca:", err);
      alert("❌ Không thể lưu phân ca!");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Xóa toàn bộ phân ca
  const handleDeleteAll = async () => {
    if (!window.confirm("⚠️ Bạn có chắc muốn XÓA toàn bộ phân ca tháng này không?")) return;

    setLoading(true);
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
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "shiftSchedules", d.id));
      }
      setAssignMap({});
      alert("🗑️ Đã xóa toàn bộ phân ca tháng này!");
    } catch (err) {
      console.error("🔥 Lỗi khi xóa phân ca:", err);
      alert("❌ Không thể xóa phân ca!");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Hiển thị đúng số ngày trong tháng
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) =>
        ref.current && !ref.current.contains(e.target) && onCancel()
      }
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Popup */}
      <div
        ref={ref}
        className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 w-11/12 max-w-lg p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10 select-none transition-colors"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-3 text-purple-600 dark:text-purple-400 flex justify-between items-center">
          <span>🗓️ Phân ca tháng {selectedMonth}/{selectedYear}</span>
          <button
            onClick={handleDeleteAll}
            disabled={loading}
            className="flex items-center gap-1 text-sm px-2 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 rounded"
          >
            <Trash2 className="w-4 h-4" /> Xóa tháng
          </button>
        </h3>

        {/* Loại ca */}
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => setShiftType("day")}
            className={`px-4 py-2 rounded-lg border transition ${
              shiftType === "day"
                ? "bg-yellow-400 text-white shadow border-yellow-500"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            ☀️ Ca ngày
          </button>
          <button
            onClick={() => setShiftType("night")}
            className={`px-4 py-2 rounded-lg border transition ${
              shiftType === "night"
                ? "bg-indigo-500 text-white shadow border-indigo-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            🌙 Ca đêm
          </button>
        </div>

        {/* Lưới ngày */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const type = assignMap[day];
            const color =
              type === "day"
                ? "bg-yellow-400 text-white border-yellow-500"
                : type === "night"
                ? "bg-indigo-500 text-white border-indigo-600"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700";
            return (
              <button
                key={day}
                onMouseDown={(e) => handleMouseDown(day, e)}
                onMouseEnter={() => handleMouseEnter(day)}
                onMouseUp={handleMouseUp}
                className={`py-2 rounded border font-medium transition select-none ${color}`}
                type="button"
              >
                {day}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
          👉 Click từng ô để đổi ca (ngày → đêm → trống), hoặc giữ chuột và kéo để chọn nhanh.  
          Dữ liệu lưu tự động trong Firestore.
        </p>

        {/* Nút hành động */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-5 py-2 rounded bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white flex items-center gap-2 disabled:opacity-70 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
              </>
            ) : (
              "💾 Lưu phân ca"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}