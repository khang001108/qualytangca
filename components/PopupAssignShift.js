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
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectingShift, setSelectingShift] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // 🔹 Load phân ca đã lưu khi mở popup
  useEffect(() => {
    if (!user?.uid || hasLoaded) return;
    (async () => {
      try {
        const col = collection(db, "shiftSchedules");
        const qShift = query(
          col,
          where("userId", "==", user.uid),
          where("date", ">=", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`),
          where("date", "<=", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`)
        );
        const snap = await getDocs(qShift);

        const newMap = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          const day = Number(data.date.split("-")[2]);
          if (!newMap[day]) newMap[day] = data.shift.includes("đêm") ? "night" : "day";
        });

        setAssignMap(newMap);
        setHasLoaded(true);
        console.log("📦 Loaded phân ca tháng:", newMap);
      } catch (err) {
        console.error("❌ Lỗi khi load phân ca:", err);
      }
    })();
  }, [user?.uid, selectedMonth, selectedYear, hasLoaded]);

  // 🔹 Click hoặc kéo chọn ngày
  const handleDayClick = (day, e) => {
    e.preventDefault();
    const cur = assignMap[day];
    const next = cur === "day" ? "night" : cur === "night" ? null : "day";
    setAssignMap((prev) => ({ ...prev, [day]: next }));
  };

  const handleMouseDown = (day, e) => {
    e.preventDefault();
    setIsSelecting(true);
    setSelectingShift(shiftType);
    setAssignMap((prev) => ({ ...prev, [day]: shiftType }));
  };

  const handleMouseEnter = (day) => {
    if (!isSelecting || !selectingShift) return;
    setAssignMap((prev) => ({ ...prev, [day]: selectingShift }));
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectingShift(null);
  };

  // 🔹 Lưu phân ca + cập nhật lại members
  const handleApply = async () => {
    if (!user?.uid) return alert("⚠️ Không có thông tin người dùng!");

    const selectedDays = Object.keys(assignMap).filter((d) => assignMap[d]);
    if (selectedDays.length === 0) return alert("⚠️ Chưa chọn ngày nào để lưu!");

    if (!window.confirm(`Xác nhận lưu phân ca cho ${selectedDays.length} ngày đã chọn?`))
      return;

    setLoading(true);
    try {
      const year = selectedYear;
      const month = selectedMonth;

      // --- Ghi dữ liệu phân ca xuống Firestore ---
      for (const dayStr of selectedDays) {
        const type = assignMap[dayStr];
        if (!type) continue;

        const shift = type === "day" ? "Ca ngày" : "Ca đêm";
        const shiftStart = type === "day" ? "07:00" : "19:00";
        const date = `${year}-${String(month).padStart(2, "0")}-${String(dayStr).padStart(2, "0")}`;

        for (const m of members) {
          if (!m?.realName) continue;
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

      // --- 🔁 Cập nhật lại ca hiện tại của các nhân viên ---
      // Lấy loại ca cuối cùng được chọn (ưu tiên ca của ngày lớn nhất)
      const lastDay = Math.max(...selectedDays.map(Number));
      const lastType = assignMap[lastDay];
      const newShift = lastType === "night" ? "Ca đêm" : "Ca ngày";
      const newShiftStart = lastType === "night" ? "19:00" : "07:00";

      for (const m of members) {
        if (!m?.id) continue;
        await updateDoc(doc(db, "members", m.id), {
          shift: newShift,
          shiftStart: newShiftStart,
        });
      }

      alert("✅ Đã lưu và đồng bộ phân ca về danh sách nhân viên!");
      onSuccess?.();
    } catch (err) {
      console.error("🔥 Lỗi lưu phân ca:", err);
      alert("❌ Không thể lưu phân ca! Xem console để biết chi tiết.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Xóa toàn bộ phân ca tháng này
  const handleDeleteAll = async () => {
    if (!window.confirm("⚠️ Bạn có chắc muốn XÓA toàn bộ phân ca tháng này không?")) return;

    setLoading(true);
    try {
      const col = collection(db, "shiftSchedules");
      const qShift = query(
        col,
        where("userId", "==", user.uid),
        where("date", ">=", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`),
        where("date", "<=", `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`)
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

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseDown={(e) =>
        ref.current && !ref.current.contains(e.target) && onCancel()
      }
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        ref={ref}
        className="relative bg-white w-11/12 max-w-lg p-6 rounded-xl shadow-2xl z-10 select-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-3 text-purple-600 flex justify-between items-center">
          <span>🗓️ Phân ca tháng {selectedMonth}/{selectedYear}</span>
          <button
            onClick={handleDeleteAll}
            disabled={loading}
            className="flex items-center gap-1 text-sm px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded"
          >
            <Trash2 className="w-4 h-4" /> Xóa tháng
          </button>
        </h3>

        {/* 🔹 Chọn loại ca */}
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => setShiftType("day")}
            className={`px-4 py-2 rounded-lg border ${
              shiftType === "day"
                ? "bg-yellow-400 text-white shadow"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            ☀️ Ca ngày
          </button>
          <button
            onClick={() => setShiftType("night")}
            className={`px-4 py-2 rounded-lg border ${
              shiftType === "night"
                ? "bg-indigo-500 text-white shadow"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            🌙 Ca đêm
          </button>
        </div>

        {/* 🔹 Lưới ngày */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const type = assignMap[day];
            const color =
              type === "day"
                ? "bg-yellow-400 text-white"
                : type === "night"
                ? "bg-indigo-500 text-white"
                : "bg-gray-100 text-gray-500";
            return (
              <button
                key={day}
                onClick={(e) => handleDayClick(day, e)}
                onMouseDown={(e) => handleMouseDown(day, e)}
                onMouseEnter={() => handleMouseEnter(day)}
                className={`py-2 rounded border font-medium transition ${color}`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mb-4 text-center">
          👉 Click từng ô để đổi ca (ngày → đêm → trống), hoặc giữ chuột và kéo
          để chọn nhanh.  
          Màu được lưu lại vĩnh viễn trong Firestore.
        </p>

        {/* 🔹 Nút hành động */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-5 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
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
