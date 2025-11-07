import React, { useState, useEffect } from "react";
import { Save, X } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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
  });

  const shiftOptions = {
    day: { start: [7, 8] },
    night: { start: [19, 20] },
  };

  useEffect(() => {
    if (!user?.uid) return;
    const fetchData = async () => {
      const ref = doc(db, "overtimeConfigs", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setConfig((prev) => ({ ...prev, ...snap.data() }));
    };
    fetchData();
  }, [user?.uid]);

  const calcOffice = (start, end, half) => {
    const duration = end > start ? end - start : 24 - start + end;
    return duration - half;
  };

  const getShiftEndOptions = (shiftType, startHour, shiftHalf = 1) => {
    const ends = [];
    const baseHours = 8 + shiftHalf;
    for (let extra = 0; extra <= 3; extra++) {
      const end = (startHour + baseHours + extra) % 24;
      ends.push(end);
    }
    return ends;
  };

  const handleChange = (key, value) => {
    setConfig((prev) => {
      let newState = { ...prev, [key]: value };

      if (key === "shiftType") {
        const start = shiftOptions[value].start[0];
        const end = getShiftEndOptions(value, start, prev.shiftHalf)[0];
        newState = {
          ...newState,
          shiftStart: start,
          shiftEnd: end,
          shiftOffice: calcOffice(start, end, prev.shiftHalf),
        };
      }

      if (key === "shiftStart") {
        const end = getShiftEndOptions(prev.shiftType, value, prev.shiftHalf)[0];
        newState.shiftEnd = end;
        newState.shiftOffice = calcOffice(value, end, prev.shiftHalf);
      }

      if (key === "shiftEnd" || key === "shiftHalf") {
        newState.shiftOffice = calcOffice(
          key === "shiftStart" ? value : prev.shiftStart,
          key === "shiftEnd" ? value : prev.shiftEnd,
          key === "shiftHalf" ? value : prev.shiftHalf
        );
      }

      return newState;
    });
  };

  const handleSave = async () => {
    try {
      await setDoc(
        doc(db, "overtimeConfigs", user.uid),
        { ...config, updatedAt: serverTimestamp() },
        { merge: true }
      );
      showToast("Đã lưu cấu hình tăng ca.", "success");
      onClose();
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi lưu.", "error");
    }
  };

  const shiftEndOptions = getShiftEndOptions(
    config.shiftType,
    config.shiftStart,
    config.shiftHalf
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[980px] max-w-[90vw] border border-gray-200 dark:border-gray-700 animate-fadeIn flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-300 dark:border-gray-700 px-8 py-4 flex-shrink-0">
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

        {/* Nội dung cuộn riêng */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            {/* === CỘT 1 === */}
            <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                🕒 Giờ hành chính
              </h3>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Loại ca
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.shiftType}
                  onChange={(e) => handleChange("shiftType", e.target.value)}
                >
                  <option value="day">🌤️ Ca ngày</option>
                  <option value="night">🌙 Ca đêm</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Giờ lên ca
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-2 focus:ring-2 focus:ring-indigo-500"
                    value={config.shiftStart}
                    onChange={(e) =>
                      handleChange("shiftStart", Number(e.target.value))
                    }
                  >
                    {shiftOptions[config.shiftType].start.map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Giờ xuống ca
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-2 focus:ring-2 focus:ring-indigo-500"
                    value={config.shiftEnd}
                    onChange={(e) =>
                      handleChange("shiftEnd", Number(e.target.value))
                    }
                  >
                    {shiftEndOptions.map((h, idx) => (
                      <option key={idx} value={h}>
                        {h}:00 {idx === 0 ? "(hành chính)" : `(+${idx}h)`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Giờ nghỉ giữa ca
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-2 focus:ring-2 focus:ring-indigo-500"
                  value={config.shiftHalf}
                  onChange={(e) =>
                    handleChange("shiftHalf", Number(e.target.value))
                  }
                />
              </div>

              <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-900 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Tổng giờ hành chính
                </span>
                <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                  {config.shiftOffice} tiếng
                </span>
              </div>
            </div>

            {/* === CỘT 2 === */}
            <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                ⏱️ Giờ tăng ca & thưởng
              </h3>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.bonusEnabled}
                    onChange={(e) =>
                      handleChange("bonusEnabled", e.target.checked)
                    }
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    Áp dụng thưởng tăng ca
                  </span>
                </label>

                {config.bonusEnabled && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300">
                        Mỗi
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="w-20 text-center rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-1"
                        value={config.bonusEvery}
                        onChange={(e) =>
                          handleChange("bonusEvery", Number(e.target.value))
                        }
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        tiếng tăng ca cộng
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-20 text-center rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-1"
                        value={config.bonusAmount}
                        onChange={(e) =>
                          handleChange("bonusAmount", Number(e.target.value))
                        }
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        giờ thưởng
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Chỉ áp dụng khi làm đủ giờ hành chính (≥ 8h).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-300 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
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
