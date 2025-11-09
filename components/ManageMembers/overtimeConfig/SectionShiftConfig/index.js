import React, { useState, useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import { useShiftFirestore } from "./useShiftFirestore";

export default function SectionShiftConfig({ config, setConfig }) {
  const { fetchConfig, saveConfig } = useShiftFirestore(setConfig);
  const [gapMinutes, setGapMinutes] = useState(15);
  const [popupOpen, setPopupOpen] = useState(false);
  const lastToggleRef = useRef(0);

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
      const start = prev.shiftStart;
      const end = prev.shiftEnd;
      const half = prev.shiftHalf;
      const office = calcOffice(start, end, half);
      const updated = { ...(prev[type] || {}) };

      updated.lenCaSomBatDau = toTime(start - gapHours);
      updated.lenCaSomKetThuc = toTime(start);
      updated.lenCaMuonBatDau = toTime(start + 1);
      updated.lenCaMuonKetThuc = toTime(start + 1 + gapHours);

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
    setPopupOpen(false);
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

  const current = config[config.shiftType] || {};

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 space-y-5 shadow-lg transition-colors">
      <h3 className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">
        🕒 Cấu hình ca làm việc
      </h3>

      {/* Loại ca */}
      <div>
        <label className="text-sm text-gray-700 dark:text-gray-300 mb-1 block">
          Loại ca
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          value={config.shiftType}
          onChange={(e) => setConfig({ ...config, shiftType: e.target.value })}
        >
          <option value="day">🌤️ Ca ngày</option>
          <option value="night">🌙 Ca đêm</option>
        </select>
      </div>

      {/* Khung giờ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Khung giờ ca sớm / ca muộn
          </label>

          {/* Nút cài đặt chênh phút */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-0.5">
              Chênh:{" "}
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {gapMinutes}
              </span>{" "}
              phút
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();                     // chặn lan trong React
                e.nativeEvent.stopImmediatePropagation(); // ✅ chặn lan trong DOM thật
                const now = Date.now();
                if (now - lastToggleRef.current < 400) return; // chống double-click
                lastToggleRef.current = now;
                setPopupOpen((prev) => !prev);
              }}
              className={`p-1 rounded transition-transform duration-300 hover:rotate-45 ${popupOpen ? "rotate-90 text-indigo-500" : ""
                }`}
              title="Cài đặt chênh phút toàn ca"
            >
              <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition" />
            </button>

          </div>
        </div>

        {/* === Ca sớm === */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 transition-colors">
          <div className="font-medium text-amber-500 mb-2">Ca sớm</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Lên ca sớm */}
            <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Lên ca:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {current.lenCaSomBatDau && current.lenCaSomKetThuc
                  ? `${current.lenCaSomBatDau} – ${current.lenCaSomKetThuc}`
                  : "--:--"}
              </span>
            </div>

            {/* Xuống ca sớm */}
            <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Xuống ca:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {current.tanCaSomBatDau && current.tanCaSomKetThuc
                  ? `${current.tanCaSomBatDau} – ${current.tanCaSomKetThuc}`
                  : "--:--"}
              </span>
            </div>
          </div>
        </div>

        {/* === Ca muộn === */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 transition-colors">
          <div className="font-medium text-amber-500 mb-2">Ca muộn</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Lên ca muộn */}
            <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Lên ca:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {current.lenCaMuonBatDau && current.lenCaMuonKetThuc
                  ? `${current.lenCaMuonBatDau} – ${current.lenCaMuonKetThuc}`
                  : "--:--"}
              </span>
            </div>

            {/* Xuống ca muộn */}
            <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Xuống ca:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {current.tanCaMuonBatDau && current.tanCaMuonKetThuc
                  ? `${current.tanCaMuonBatDau} – ${current.tanCaMuonKetThuc}`
                  : "--:--"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Giờ nghỉ giữa ca */}
      <div>
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

      {/* Tổng giờ hành chính */}
      <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-3 rounded-lg">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Tổng giờ hành chính
        </span>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
          {config.shiftOffice} tiếng
        </span>
      </div>

      {/* === Popup Cài đặt chênh phút === */}
      {popupOpen && (
        <div
          key="gap-popup"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in-out"
          onClick={() => setPopupOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-300 dark:border-gray-700 shadow-2xl w-80 space-y-4"
          >
            <h4 className="text-center font-semibold text-indigo-600 dark:text-indigo-400 text-lg">
              ⚙️ Cài đặt chênh phút toàn ca
            </h4>

            <select
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              value={gapMinutes}
              onChange={(e) => setGapMinutes(Number(e.target.value))}
            >
              {[10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>
                  {m} phút
                </option>
              ))}
            </select>

            <p className="text-xs text-center text-gray-600 dark:text-gray-400">
              Áp dụng đồng thời cho:{" "}
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                Lên ca + Xuống ca
              </span>
            </p>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => applyGapToAll(gapMinutes)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
