// components/ManageMembers/overtimeConfig/SectionShiftConfig/index.jsx
// Cấu hình ca làm việc cho nhân viên (ca ngày/ca đêm)


import React, { useState, useEffect } from "react";
import { Sun, Moon, Save } from "lucide-react";
import { useShiftFirestore } from "./useShiftFirestore";

export default function SectionShiftConfig({ config, setConfig }) {
  const { fetchConfig, saveConfig } = useShiftFirestore(setConfig);
  const [gapMinutes, setGapMinutes] = useState(15);

  useEffect(() => {
    fetchConfig();
  }, []);

  const calcOffice = (start, end, half) => {
    let duration = end - start;
    if (duration < 0) duration += 24;
    return duration - half;
  };

  const toTime = (h) => {
    const hh = Math.floor(h) % 24;
    const mm = Math.round((h % 1) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const applyGapToAll = (gap) => {
    const gapHours = gap / 60;
    setConfig((prev) => {
      const type = prev.shiftType;
      const shiftData = prev[type] || {};
      const start = shiftData.gioLenCa ?? prev.shiftStart;
      const end = shiftData.gioXuongCa ?? prev.shiftEnd;
      const half = shiftData.nghiGiuaCa ?? prev.shiftHalf;

      const office = calcOffice(start, end, half);
      const updated = { ...shiftData };

      updated.lenCaSomBatDau = toTime(start - gapHours);
      updated.lenCaSomKetThuc = toTime(start);
      updated.lenCaMuonBatDau = toTime(start + 1 - gapHours);
      updated.lenCaMuonKetThuc = toTime(start + 1);

      updated.tanCaSomBatDau = toTime(end);
      updated.tanCaSomKetThuc = toTime(end + gapHours);
      updated.tanCaMuonBatDau = toTime(end + 1);
      updated.tanCaMuonKetThuc = toTime(end + 1 + gapHours);

      updated.gioLenCa = start;
      updated.gioXuongCa = end;
      updated.nghiGiuaCa = half;
      updated.tongGioHanhChinh = office;

      return {
        ...prev,
        shiftOffice: office,
        [type]: updated,
      };
    });
  };

  const handleGapChange = (e) => {
    const newGap = Number(e.target.value);
    setGapMinutes(newGap);
    applyGapToAll(newGap);
  };

  const handleBreakChange = (value) => {
    const newHalf = Number(value);
    setConfig((prev) => {
      const start = prev.shiftStart;
      const end = prev.shiftEnd;
      const type = prev.shiftType;
      const office = calcOffice(start, end, newHalf);
      return {
        ...prev,
        shiftHalf: newHalf,
        shiftOffice: office,
        [type]: {
          ...(prev[type] || {}),
          nghiGiuaCa: newHalf,
          tongGioHanhChinh: office,
        },
      };
    });
  };

  const handleSave = () => {
    saveConfig(config);
  };

  const toggleShiftType = () => {
    setConfig((prev) => ({
      ...prev,
      shiftType: prev.shiftType === "day" ? "night" : "day",
    }));
  };

  const current = config[config.shiftType] || {};

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-2xl p-6 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">
          🕒 Cấu hình ca làm việc
        </h3>

        {/* Switch ca ngày / ca đêm */}
        <div
          onClick={toggleShiftType}
          className={`relative flex items-center w-20 h-9 rounded-full cursor-pointer transition-all duration-300 ${
            config.shiftType === "day" ? "bg-yellow-400" : "bg-indigo-600"
          }`}
        >
          <div
            className={`absolute left-1 top-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center transform transition-transform duration-300 ${
              config.shiftType === "day" ? "translate-x-0" : "translate-x-11"
            }`}
          >
            {config.shiftType === "day" ? (
              <Sun size={18} className="text-yellow-400" />
            ) : (
              <Moon size={18} className="text-indigo-600" />
            )}
          </div>
        </div>
      </div>

      {/* Chênh lệch ca */}
      <div>
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Khung giờ ca sớm / ca muộn
        </label>
        <select
          className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          value={gapMinutes}
          onChange={handleGapChange}
        >
          {[10, 15, 20, 30].map((val) => (
            <option key={val} value={val}>
              Chênh {val} phút
            </option>
          ))}
        </select>
      </div>

      {/* Ca sớm và muộn */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Ca sớm */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="font-medium text-amber-500 mb-2">Ca sớm</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-white dark:bg-gray-900 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700">
              <span>Lên ca:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {current.lenCaSomBatDau && current.lenCaSomKetThuc
                  ? `${current.lenCaSomBatDau} – ${current.lenCaSomKetThuc}`
                  : "--:--"}
              </span>
            </div>
            <div className="flex justify-between bg-white dark:bg-gray-900 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700">
              <span>Xuống ca:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {current.tanCaSomBatDau && current.tanCaSomKetThuc
                  ? `${current.tanCaSomBatDau} – ${current.tanCaSomKetThuc}`
                  : "--:--"}
              </span>
            </div>
          </div>
        </div>

        {/* Ca muộn */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="font-medium text-amber-500 mb-2">Ca muộn</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between bg-white dark:bg-gray-900 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700">
              <span>Lên ca:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {current.lenCaMuonBatDau && current.lenCaMuonKetThuc
                  ? `${current.lenCaMuonBatDau} – ${current.lenCaMuonKetThuc}`
                  : "--:--"}
              </span>
            </div>
            <div className="flex justify-between bg-white dark:bg-gray-900 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700">
              <span>Xuống ca:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {current.tanCaMuonBatDau && current.tanCaMuonKetThuc
                  ? `${current.tanCaMuonBatDau} – ${current.tanCaMuonKetThuc}`
                  : "--:--"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Giờ nghỉ giữa ca + Tổng giờ */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Giờ nghỉ giữa ca
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            className="w-full mt-1 border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            value={config.shiftHalf}
            onChange={(e) => handleBreakChange(e.target.value)}
          />
        </div>

        <div className="flex-1">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Tổng giờ hành chính
          </label>
          <div className="mt-1 w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-2 rounded-lg font-semibold text-indigo-600 dark:text-indigo-400">
            {config.shiftOffice} tiếng
          </div>
        </div>
      </div>

      {/* Nút lưu theo loại ca */}
      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 rounded-lg p-2 font-semibold text-white shadow-md transition ${
          config.shiftType === "day"
            ? "bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90"
            : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90"
        }`}
      >
        <Save size={18} />
        {config.shiftType === "day" ? "Lưu ca ngày" : "Lưu ca đêm"}
      </button>
    </div>
  );
}
