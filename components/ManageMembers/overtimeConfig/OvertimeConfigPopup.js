import React, { useState } from "react";
import { Save, X, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SectionShiftConfig from "./SectionShiftConfig";
import SectionOvertimeLimit from "./SectionOvertimeConfig";
import SectionBonusConfig from "./SectionBonusConfig";
import FormulaPreview from "./FormulaPreview";

export default function OvertimeConfigPopup({ user, onClose, showToast }) {
  const [config, setConfig] = useState({
    shiftType: "day",
    shiftStart: 7,
    shiftEnd: 16,
    shiftHalf: 1,
    shiftOffice: 8,
    bonusEnabled: true,
    bonusEvery: 2,
    bonusAmount: 0.5,
    monthlyLimit: 0,
    workedHours: 0,
    remaining: 0,
  });

  const [activeTab, setActiveTab] = useState("shift");

  const renderTabContent = () => {
    switch (activeTab) {
      case "shift":
        return <SectionShiftConfig config={config} setConfig={setConfig} />;

      case "limit":
        return <SectionOvertimeLimit config={config} setConfig={setConfig} />;

      case "bonus":
        return <SectionBonusConfig config={config} setConfig={setConfig} />;

      case "formula":
        return <FormulaPreview config={config} />; // ← thêm dòng này

      default:
        return null;
    }
  };

  const handleSave = async () => {
    try {
      showToast("Đã lưu toàn bộ cấu hình tăng ca", "success");
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lưu cấu hình", "error");
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-3"
      onClick={onClose}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-3 border-b border-gray-300 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <h2 className="flex items-center gap-2 font-semibold text-lg">
              <Settings size={18} /> Cấu hình tăng ca
            </h2>
            <button onClick={onClose} className="hover:text-gray-200">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-3 py-3 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
            {[
              { id: "formula", label: "Công thức" },
              { id: "shift", label: "Giờ hành chính" },
              { id: "limit", label: "Giờ tăng ca" },
              { id: "bonus", label: "Thưởng tăng ca" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-md scale-105"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-[520px] overflow-y-auto rounded-lg relative bg-gray-50 dark:bg-gray-900">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
                className="min-h-full p-2"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-4 px-6 py-3 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              Lưu toàn bộ
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
