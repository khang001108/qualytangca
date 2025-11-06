import { useState, useRef } from "react";
import { CirclePlus } from "lucide-react";
import Toast from "./Toast";
import useOvertimeParser from "../hooks/useOvertimeParser/index";

export default function OvertimeForm({
  user,
  members = [],
  setMembers,
  setItems,
  selectedMonth,
  selectedYear,
  selectedDate,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [mode, setMode] = useState("checkin"); // "checkin" | "checkout"
  const modalRef = useRef();
  const [toasts, setToasts] = useState([]);

  const showToast = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const { parseText } = useOvertimeParser({
    user,
    members,
    setMembers,
    setItems,
    selectedMonth,
    selectedYear,
    selectedDate,
  });

  const handleParse = async () => {
    if (!textInput.trim()) {
      showToast("error", "⚠️ Vui lòng nhập dữ liệu chấm công trước.");
      return;
    }

    try {
      await parseText(textInput, mode);
      showToast("success", "✅ Dữ liệu chấm công đã được xử lý thành công!");
    } catch (err) {
      console.error("Lỗi xử lý:", err);
      showToast("error", "❌ Đã xảy ra lỗi khi xử lý dữ liệu!");
    } finally {
      setTextInput("");
      setFormOpen(false);
    }
  };

  return (
    <>
      {/* 🔹 Toast nhiều cái cùng lúc */}
      <Toast toasts={toasts} onClose={removeToast} />

      {/* Nút mở form */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition"
        >
          <CirclePlus className="w-5 h-5" /> Thêm tăng ca
        </button>
      </div>

      {/* Modal nhập dữ liệu */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onMouseDown={(e) =>
            modalRef.current &&
            !modalRef.current.contains(e.target) &&
            setFormOpen(false)
          }
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Popup */}
          <div
            ref={modalRef}
            className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 w-11/12 max-w-xl p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10 transition-colors"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                Thêm tăng ca
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
              >
                ✕
              </button>
            </div>

            {/* 🔹 Chọn chế độ */}
            <div className="flex gap-2 mb-4">
              <button
                className={`flex-1 py-2 rounded-lg border transition font-medium ${
                  mode === "checkin"
                    ? "bg-green-500 hover:bg-green-600 text-white shadow"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                }`}
                onClick={() => setMode("checkin")}
              >
                ☀️ Lên ca (Check-in)
              </button>
              <button
                className={`flex-1 py-2 rounded-lg border transition font-medium ${
                  mode === "checkout"
                    ? "bg-blue-500 hover:bg-blue-600 text-white shadow"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                }`}
                onClick={() => setMode("checkout")}
              >
                🌙 Xuống ca (Check-out)
              </button>
            </div>

            {/* 🔹 Ô nhập dữ liệu */}
            <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
              Dán dữ liệu chấm công (
              {mode === "checkin" ? "Lên ca" : "Xuống ca"})
            </label>
            <textarea
              rows={6}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded-lg mb-4 focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-500 outline-none transition"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                mode === "checkin"
                  ? "Dán dữ liệu chấm công ca lên (ví dụ: 1.陈明壯/6:52)"
                  : "Dán dữ liệu chấm công ca xuống (ví dụ: 1.陈明壯/19:32)"
              }
            />

            {/* 🔹 Nút xử lý */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 transition"
              >
                Quay lại
              </button>
              <button
                onClick={handleParse}
                className={`px-5 py-2 rounded-lg text-white shadow-md transition ${
                  mode === "checkin"
                    ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                    : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                }`}
              >
                {mode === "checkin"
                  ? "Xử lý Check-in"
                  : "Xử lý Check-out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
