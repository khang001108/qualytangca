import React, { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import SectionShiftConfig from "./SectionShiftConfig";
import SectionOvertimeConfig from "./SectionOvertimeConfig";
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

  // --- Load dữ liệu Firestore ---
  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      const refConfig = doc(db, "overtimeConfigs", user.uid);
      const snap = await getDoc(refConfig);
      const cfg = snap.exists() ? snap.data() : {};
      const refMember = doc(db, "members", user.uid);
      const snapMember = await getDoc(refMember);
      const ot = snapMember.exists()
        ? snapMember.data().overtimeLimit || {}
        : {};
      setConfig((prev) => ({
        ...prev,
        ...cfg,
        monthlyLimit: ot.monthlyLimit || 0,
        workedHours: ot.workedHours || 0,
        remaining: ot.remaining || 0,
      }));
    };
    load();
  }, [user?.uid]);

  const handleSave = async () => {
    try {
      const baseData = { ...config, updatedAt: serverTimestamp() };

      await Promise.all([
        setDoc(doc(db, "overtimeConfigs_day", user.uid), baseData, {
          merge: true,
        }),
        setDoc(doc(db, "overtimeConfigs_night", user.uid), baseData, {
          merge: true,
        }),
      ]);

      showToast("Đã lưu cấu hình cho ca ngày và ca đêm.", "success");
      // Giữ popup mở
    } catch (err) {
      showToast("Lỗi khi lưu dữ liệu.", "error");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[1000px] max-w-[95vw] border border-gray-200 dark:border-gray-700 animate-fadeIn flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 px-8 py-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            ⚙️ Cấu hình tăng ca
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <SectionShiftConfig config={config} setConfig={setConfig} />
            <SectionOvertimeConfig config={config} setConfig={setConfig} />
          </div>

          <SectionBonusConfig config={config} setConfig={setConfig} />
          <FormulaPreview config={config} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow"
          >
            <Save className="w-4 h-4" />
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
