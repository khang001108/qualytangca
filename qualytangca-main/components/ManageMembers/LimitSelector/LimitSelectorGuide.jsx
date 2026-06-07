// components/ManageMembers/LimitSelector/LimitSelectorGuide.jsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function LimitSelectorGuide({ showGuide, setShowGuide }) {
  return (
    <>
      <div className="px-6 pt-3">
        <button
          onClick={() => setShowGuide((p) => !p)}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {showGuide ? "Ẩn hướng dẫn ▲" : "Hướng dẫn ▼"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showGuide && (
          <motion.div
            key="guide"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden px-6"
          >
            <div className="bg-indigo-50 dark:bg-gray-700/40 p-4 rounded-lg mb-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <p>• Chọn nhân viên → đặt giới hạn ngay.</p>
              <p>• Ô nhập giúp đặt giới hạn chung cho nhiều người.</p>
              <p>• Sắp xếp theo trạng thái bằng cách nhấn vào cột Trạng thái.</p>
              <p>• Xóa giới hạn: nhấn nút đỏ → tick nhân viên → nhấn lại.</p>
              <p>• Nhớ nhấn “Lưu thay đổi” để ghi dữ liệu.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
