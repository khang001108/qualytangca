// src/components/PopupManager.jsx
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import ManageMembers from "./ManageMembers";
import ShiftAssign from "./ManageMembers/ShiftAssign";
import { Users, Trash2, X } from "lucide-react";

export default function PopupManager({
  onClose,
  user,
  selectedMonth,
  selectedYear,
  selectedDate,
  shiftSchedules = {},
  handleDeleteAll,
  setToast,
}) {
  const [showAssign, setShowAssign] = useState(false);

  // 🔒 Khóa cuộn nền khi mở popup
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (showAssign) {
    return (
      <ShiftAssign
        user={user}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onCancel={() => setShowAssign(false)}
        onStatusChange={({ loading, success, month }) => {
          if (loading)
            setToast({ type: "loading", msg: "⏳ Đang lưu phân ca..." });
          else if (success)
            setToast({
              type: "success",
              msg: `✅ Phân ca tháng ${month} hoàn tất.`,
            });
          else setToast({ type: "error", msg: "❌ Lỗi khi lưu phân ca!" });
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 
             rounded-2xl w-[90%] max-w-5xl shadow-2xl border border-gray-200 
             dark:border-gray-700 flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* 🔹 Nút đóng góc phải */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 🔹 Nội dung chính có thể cuộn */}
        <div className="flex-1 p-6">
          {/* 🔹 Tiêu đề */}
          <div className="flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 font-semibold gap-2">
            <motion.div whileHover={{ scale: 1.1 }}>
              <Users className="w-6 h-6" />
            </motion.div>
            <span className="text-xl tracking-wide">Quản lý nhân viên</span>
          </div>

          {/* 🔹 Ngày hiện tại */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
            Ngày hiện tại:{" "}
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {new Date().toLocaleDateString("vi-VN")}
            </span>
          </div>

          {/* --- Quản lý nhân viên --- */}
          <div
            className="border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 mb-4 
                        hover:border-zinc-400 dark:hover:border-zinc-600 
                        hover:bg-zinc-50 dark:hover:bg-gray-800 transition"
          >
            <ManageMembers
              user={user}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              selectedDate={selectedDate}
              shiftSchedules={shiftSchedules}
              setToast={setToast}
            />
          </div>
        </div>

        {/* --- Xóa toàn bộ dữ liệu tháng (cố định ở cuối) --- */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-center sticky bottom-0">
          <button
            onClick={handleDeleteAll}
            className="w-full border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 
                       hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 dark:hover:border-red-600 
                       py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Xóa toàn bộ dữ liệu trong tháng {selectedMonth}/{selectedYear}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
