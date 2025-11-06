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
import { db } from "../../lib/firebase";
import { Loader2, Trash2 } from "lucide-react";

export default function ShiftAssign({
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

  // 🔄 Reset mỗi lần mở lại popup
  useEffect(() => {
    if (!user?.uid) return;
    setHasLoaded(false);
    setAssignMap({});
  }, [selectedMonth, selectedYear, user?.uid]);

  // 🔹 Load dữ liệu phân ca hiện tại
  useEffect(() => {
    if (!user?.uid || hasLoaded) return;
    (async () => {
      try {
        const col = collection(db, "shiftSchedules");
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
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

  // 🧠 Xử lý click + kéo
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

    // ✅ Toggle trực tiếp ô được nhấn
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

  // 💾 Lưu vào Firestore + đồng bộ sang members
  const handleApply = async () => {
    if (!user?.uid) return;
    const selectedDays = Object.keys(assignMap).filter((d) => assignMap[d]);
    if (selectedDays.length === 0)
      return showPopup("⚠️ Chưa chọn ngày nào để lưu!", "error");

    setLoading(true);
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

          // ✅ Ghi ca vào shiftSchedules
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

          // ✅ Đồng bộ sang members
          const memberRef = doc(db, "members", m.id);
          await updateDoc(memberRef, {
            shift,
            shiftStart,
            updatedAt: serverTimestamp(),
          });
        }
      }

      showPopup("✅ Đã lưu phân ca và đồng bộ thành công!", "success");
      onSuccess?.();
    } catch (err) {
      console.error("🔥 Lỗi lưu phân ca:", err);
      showPopup("❌ Không thể lưu phân ca!", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Xóa toàn bộ phân ca tháng
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
      for (const d of snap.docs) await deleteDoc(doc(db, "shiftSchedules", d.id));

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
        className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 w-11/12 max-w-lg p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10 select-none"
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

        {/* Popup message */}
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

        {/* Nút chọn ca */}
        <div
          className={`flex justify-center gap-3 mb-4 transition ${
            loading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <button
            onClick={() => setShiftType("day")}
            className={`px-4 py-2 rounded-lg border ${
              shiftType === "day"
                ? "bg-yellow-400 text-white shadow border-yellow-500"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
            }`}
          >
            ☀️ Ca ngày
          </button>
          <button
            onClick={() => setShiftType("night")}
            className={`px-4 py-2 rounded-lg border ${
              shiftType === "night"
                ? "bg-indigo-500 text-white shadow border-indigo-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
            }`}
          >
            🌙 Ca đêm
          </button>
        </div>

        {/* Lưới ngày */}
        <div
          className={`grid grid-cols-7 gap-2 mb-4 transition ${
            loading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
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
                className={`py-2 rounded border font-medium transition select-none ${color}`}
                disabled={loading}
              >
                {day}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
          👉 Click để tô ca ngày/đêm, click lại để bỏ. Giữ chuột và kéo để tô nhanh.
        </p>

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
