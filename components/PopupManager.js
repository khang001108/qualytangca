import { motion } from "framer-motion";
<<<<<<< HEAD
import ManageMembers from "./ManageMembers";
import OvertimeLimit from "./OvertimeLimit";
import { Users, Timer, Trash2 } from "lucide-react";
=======
import OverMember from "./OverMember";
import OvertimeForm from "./OvertimeForm";
import OvertimeLimit from "./OvertimeLimit";
import ManageMembers from "./ManageMembers"; // file mới tạo
import { ArrowUp, Users } from "lucide-react";
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056

export default function PopupManager({
  onClose,
  user,
  members,
  setMembers,
  overtimeLimit,
  setOvertimeLimit,
  overtimeItems,
  setOvertimeItems,
  selectedMonth,
  selectedYear,
  selectedDate,
  handleDeleteAll,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
<<<<<<< HEAD
        className="bg-white rounded-2xl p-6 w-[90%] max-w-3xl shadow-2xl animate-fadeIn overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- Giới hạn tăng ca --- */}
        {/* <div className="border border-yellow-200 rounded-xl p-4 mb-4 hover:border-yellow-400 hover:bg-yellow-50 transition">
          <div className="flex items-center gap-2 mb-3 text-yellow-600 font-semibold">
            <motion.div whileHover={{ scale: 1.1 }}>
              <Timer className="w-5 h-5" />
=======
        className="bg-white rounded-2xl p-6 w-[90%] max-w-2xl shadow-2xl animate-fadeIn overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tăng ca */}
        <div className="border border-indigo-200 rounded-xl p-4 mb-4 hover:border-indigo-400 hover:bg-indigo-50 transition">
          <div className="flex items-center gap-2 mb-3 text-indigo-600 font-semibold">
            <motion.div whileHover={{ scale: 1.1 }}>
              <ArrowUp className="w-5 h-5" />
            </motion.div>
            <span>Thêm tăng ca</span>
          </div>
          <OvertimeForm
            user={user}
            members={members}
            setMembers={setMembers}
            setItems={setOvertimeItems}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDate={selectedDate}
          />
        </div>

        {/* Giới hạn tăng ca */}
        <div className="border border-yellow-200 rounded-xl p-4 mb-4 hover:border-yellow-400 hover:bg-yellow-50 transition">
          <div className="flex items-center gap-2 mb-3 text-yellow-600 font-semibold">
            <motion.div whileHover={{ scale: 1.1 }}>
              <ArrowUp className="w-5 h-5 rotate-180" />
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
            </motion.div>
            <span>Giới hạn tăng ca</span>
          </div>
          <OvertimeLimit
            user={user}
            overtimeLimit={overtimeLimit}
            setOvertimeLimit={setOvertimeLimit}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
<<<<<<< HEAD
        </div> */}

        {/* --- Quản lý nhân viên --- */}
        <div className="border border-purple-200 rounded-xl p-4 mb-4 hover:border-purple-400 hover:bg-purple-50 transition">
          <div className="flex items-center gap-2 mb-3 text-purple-600 font-semibold">
            <motion.div whileHover={{ scale: 1.1 }}>
              <Users className="w-5 h-5" />
            </motion.div>
            <span>Quản lý nhân viên</span>
          </div>
          <ManageMembers
            user={user}
            members={members}
            setMembers={setMembers}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>

        {/* --- Xóa toàn bộ dữ liệu tháng --- */}
        <div className="mt-6 text-center">
          <button
            onClick={handleDeleteAll}
            className="w-full border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-500 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Xóa toàn bộ dữ liệu trong tháng {selectedMonth}/{selectedYear}
=======
        </div>

        {/* Quản lý nhân viên */}
        <div className="border border-purple-200 rounded-xl p-4 mb-4 hover:border-purple-400 hover:bg-purple-50 transition">
          <div className="flex items-center gap-2 mb-3 text-purple-600 font-semibold">
            <motion.div whileHover={{ scale: 1.1 }}>
              <Users className="w-5 h-5" />
            </motion.div>
            <span>Quản lý nhân viên</span>
          </div>
          <ManageMembers
            user={user}
            members={members}
            setMembers={setMembers}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>

        {/* Xóa toàn bộ dữ liệu trong tháng */}
        <div className="mt-6 text-center">
          <button
            onClick={handleDeleteAll}
            className="w-full border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-500 py-2 rounded-lg font-medium transition"
          >
            🗑️ Xóa toàn bộ dữ liệu trong tháng {selectedMonth}/{selectedYear}
>>>>>>> 00b5a7d4d8074ab515c5a0cfd8488287c1d29056
          </button>
        </div>

        {/* Đóng popup */}
        <button
          onClick={onClose}
          className="mt-5 w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-gray-700 font-medium"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
