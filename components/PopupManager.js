import { motion } from "framer-motion";
import ManageMembers from "./ManageMembers";
import { Users, Trash2 } from "lucide-react";

export default function PopupManager({
  onClose,
  user,
  selectedMonth,
  selectedYear,
  selectedDate,
  shiftSchedules = {},
  handleDeleteAll,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-x-hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-2xl p-6 w-[90%] max-w-5xl shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- Header --- */}
        <div className="flex items-center gap-2 mb-3 text-purple-600 dark:text-purple-400 font-semibold">
          {/* --- Hiển thị ngày --- */}

          <motion.div whileHover={{ scale: 1.1 }}>
            <Users className="w-5 h-5" />
          </motion.div>
          <span>Quản lý nhân viên</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Ngày hiện tại:{" "}
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {new Date().toLocaleDateString("vi-VN")}
          </span>
        </div>

        {/* --- Nội dung chính --- */}
        <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 mb-4 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-gray-800 transition">
          <ManageMembers
            user={user}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDate={selectedDate}
            shiftSchedules={shiftSchedules}
          />
        </div>

        {/* --- Xóa toàn bộ dữ liệu tháng --- */}
        <div className="mt-6 text-center">
          <button
            onClick={handleDeleteAll}
            className="w-full border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 dark:hover:border-red-600 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Xóa toàn bộ dữ liệu trong tháng {selectedMonth}/{selectedYear}
          </button>
        </div>

        {/* --- Đóng --- */}
        <button
          onClick={onClose}
          className="mt-5 w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 py-2 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition"
        >
          Đóng
        </button>
      </motion.div>
    </div>
  );
}
