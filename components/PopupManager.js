import { motion } from "framer-motion";
import ManageMembers from "./ManageMembers";
import OvertimeLimit from "./OvertimeLimit";
import { Users, Timer, Trash2 } from "lucide-react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";

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
        className="bg-white rounded-2xl p-6 w-[90%] max-w-5xl shadow-2xl animate-fadeIn overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- Giới hạn tăng ca --- */}
        {/* <div className="border border-yellow-200 rounded-xl p-4 mb-4 hover:border-yellow-400 hover:bg-yellow-50 transition">
          <div className="flex items-center gap-2 mb-3 text-yellow-600 font-semibold">
            <motion.div whileHover={{ scale: 1.1 }}>
              <Timer className="w-5 h-5" />
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
        </div> */}

        {/* --- Quản lý nhân viên --- */}
        <div className="flex items-center gap-2 mb-3 text-purple-600 font-semibold">
          <motion.div whileHover={{ scale: 1.1 }}>
            <Users className="w-5 h-5" />
          </motion.div>
          <span>Quản lý nhân viên</span>
        </div>
        <div className="border border-zinc-600 rounded-xl p-4 mb-4 hover:border-zinc-700 hover:bg-zinc-50 transition">
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
          </button>
        </div>

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
