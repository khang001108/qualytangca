// components/OvertimeLimit.js
import { useEffect, useState, useRef } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { getZodiacForMonth } from "../utils/zodiacUtils";

const monthNames = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

export default function OvertimeLimit({ user, selectedMonth, selectedYear }) {
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const modalRef = useRef();

  // 🔹 Đóng modal bằng ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // 🔹 Lưu giới hạn tăng ca cho tất cả member
  const handleSave = async () => {
    if (!user) return alert("Bạn cần đăng nhập");
    if (inputValue.trim() === "") return alert("Vui lòng nhập số giờ hợp lệ");

    const val = Number(inputValue);
    if (isNaN(val) || val <= 0) return alert("Vui lòng nhập số lớn hơn 0");

    setStatus("loading");
    setLoading(true);

    try {
      const membersRef = collection(db, "members");
      const snapshot = await getDocs(membersRef);

      const updates = snapshot.docs.map(async (memberDoc) => {
        const oldLimit = memberDoc.data().overtimeLimit || {};
        const newLimit = {
          ...oldLimit,
          [String(selectedYear)]: {
            ...(oldLimit[String(selectedYear)] || {}),
            [String(selectedMonth)]: val,
          },
        };
        await updateDoc(doc(db, "members", memberDoc.id), { overtimeLimit: newLimit });
      });

      await Promise.all(updates);

      setStatus("success");
      setTimeout(() => {
        setOpen(false);
        setInputValue("");
        setStatus(null);
        setLoading(false);
      }, 1200);
    } catch (err) {
      console.error("Lỗi lưu tăng ca:", err);
      setStatus("error");
      setTimeout(() => setStatus(null), 2500);
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="flex justify-end mt-2">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:brightness-110 active:scale-95 transition-all duration-200"
        >
          <Clock className="w-5 h-5" />
          <span className="font-semibold text-sm tracking-wide">
            Nhập giới hạn tăng ca cho tất cả nhân viên
          </span>
        </button>
      </div>

      {/* 🔹 Popup nhập giới hạn */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onMouseDown={(e) => {
            if (modalRef.current && !modalRef.current.contains(e.target))
              setOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            ref={modalRef}
            className="relative bg-white w-11/12 max-w-sm p-6 rounded-xl shadow-2xl z-10"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="text-indigo-600 w-5 h-5" />
                <span className="text-2xl animate-bounce-slow inline-block">
                  {getZodiacForMonth(selectedMonth, selectedYear)}
                </span>
                {monthNames[selectedMonth]} {selectedYear}
              </h2>

              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-800 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-500 text-sm mb-2">
              Nhập số giờ tăng ca tối đa cho tất cả nhân viên trong tháng này:
            </p>

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setInputValue(raw);
                  }}
                  placeholder="Ví dụ: 50"
                  className="w-full pl-3 pr-6 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition text-gray-800"
                  inputMode="numeric"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  giờ
                </span>
              </div>
            </div>

            {/* Trạng thái */}
            {status === "success" && (
              <div className="text-green-600 flex items-center justify-center text-sm mb-2">
                <CheckCircle className="w-4 h-4 mr-1" /> Đã lưu thành công
              </div>
            )}
            {status === "error" && (
              <div className="text-red-600 flex items-center justify-center text-sm mb-2">
                <AlertCircle className="w-4 h-4 mr-1" /> Lưu thất bại
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={status === "loading" || status === "success" || loading}
                className={`flex-1 py-2 rounded-lg text-white font-medium transition ${
                  status === "loading" || status === "success" || loading
                    ? "bg-indigo-300 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-600"
                }`}
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin w-4 h-4 mr-1" /> Đang lưu...
                  </span>
                ) : (
                  "Lưu"
                )}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-gray-200 py-2 rounded-lg hover:bg-gray-300 text-gray-700"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
