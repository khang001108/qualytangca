import React, { useState, useEffect } from "react";
import { Sun, Moon, Save, Edit3, X, Coffee } from "lucide-react";
import { useShiftFirestore } from "./useShiftFirestore";

export default function SectionShiftConfig({ config, setConfig }) {
  const { fetchConfig, saveConfig } = useShiftFirestore(setConfig);
  const [popup, setPopup] = useState({ open: false, field: "", value: "" });

  useEffect(() => {
    fetchConfig();
  }, []);

  const toggleShiftType = () => {
    setConfig((prev) => ({
      ...prev,
      shiftType: prev.shiftType === "day" ? "night" : "day",
    }));
  };

  const handleSave = () => {
    const office = calcOffice();
    const updatedConfig = { ...config };

    if (!office.error) {
      // Tính số giờ dạng thập phân từ giá trị trong calcOffice()
      const breakTime = parseFloat(current.nghiGiuaCa || 0);

      const startEarly = parseTime(current.lenCaSomKetThuc);
      const endEarly = parseTime(current.tanCaSomBatDau);
      let diffEarly = endEarly - startEarly;
      if (diffEarly < 0) diffEarly += 24;

      const totalEarly = diffEarly - breakTime; // số giờ thực tế
      const totalHours = Math.round(totalEarly * 100) / 100; // làm tròn 2 chữ số

      updatedConfig[config.shiftType].tongGioHanhChinh = totalHours;
    } else {
      updatedConfig[config.shiftType].tongGioHanhChinh = 0;
    }

    saveConfig(updatedConfig);
  };

  const handleOpenPopup = (field, currentValue) => {
    setPopup({ open: true, field, value: currentValue || "" });
  };

  const handlePopupSave = () => {
    if (!popup.field) return;
    setConfig((prev) => {
      const type = prev.shiftType;
      const updated = {
        ...(prev[type] || {}),
        [popup.field]: popup.value,
      };
      return { ...prev, [type]: updated };
    });
    setPopup({ open: false, field: "", value: "" });
  };

  const handlePopupKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePopupSave();
    }
  };

  const current = config[config.shiftType] || {};

  // === Hàm tính giờ hành chính ===
  const parseTime = (str) => {
    if (!str) return 0;
    const clean = str
      .replace(/[^\d:]/g, "")
      .replace(/^(\d{1,2})(\d{2})$/, "$1:$2");
    const [h, m] = clean.split(":").map(Number);
    return (h || 0) + (m || 0) / 60;
  };

  // === Hàm tính tổng giờ hành chính cho ca sớm và ca muộn ===
  const calcOffice = () => {
    const breakTime = parseFloat(current.nghiGiuaCa || 0);

    // --- Ca sớm ---
    const startEarly = parseTime(current.lenCaSomKetThuc);
    const endEarly = parseTime(current.tanCaSomBatDau);
    let diffEarly = endEarly - startEarly;
    if (diffEarly < 0) diffEarly += 24;
    const totalEarly = diffEarly - breakTime;

    // --- Ca muộn ---
    const startLate = parseTime(current.lenCaMuonKetThuc);
    const endLate = parseTime(current.tanCaMuonBatDau);
    let diffLate = endLate - startLate;
    if (diffLate < 0) diffLate += 24;
    const totalLate = diffLate - breakTime;

    // --- So sánh 2 ca ---
    const minutesEarly = Math.round(totalEarly * 60);
    const minutesLate = Math.round(totalLate * 60);
    const deltaMinutes = Math.abs(minutesEarly - minutesLate);

    const fmt = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h} tiếng ${m} phút` : `${h} tiếng`;
    };

    if (deltaMinutes > 0) {
      return {
        error: true,
        msg: `Ca muộn khác ca sớm: ca sớm ${fmt(minutesEarly)} ≠ ca muộn ${fmt(
          minutesLate
        )}. Chênh lệch ${deltaMinutes} phút. Hãy chỉnh "Lên ca" hoặc "Xuống ca" để hai ca có giờ hành chính bằng nhau.`,
        early: fmt(minutesEarly),
        late: fmt(minutesLate),
        deltaMinutes,
      };
    }

    return {
      error: false,
      value: fmt(minutesEarly),
    };
  };

  const renderRow = (label, startKey, endKey) => (
    <div className="flex justify-between bg-white dark:bg-gray-900 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 items-center">
      <span>{label}:</span>
      <div className="flex items-center gap-2">
        <span
          onClick={() => handleOpenPopup(startKey, current[startKey])}
          className="font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center gap-1"
        >
          {current[startKey] || "--:--"} <Edit3 size={14} />
        </span>
        <span>–</span>
        <span
          onClick={() => handleOpenPopup(endKey, current[endKey])}
          className="font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center gap-1"
        >
          {current[endKey] || "--:--"} <Edit3 size={14} />
        </span>
      </div>
    </div>
  );

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-2xl p-6 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-indigo-600 dark:text-indigo-400">
          🕒 Giờ hành chính
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

      {/* Ca sớm và muộn */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Ca sớm */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="font-medium text-amber-500 mb-2">Ca sớm</div>
          <div className="space-y-2 text-sm">
            {renderRow("Lên ca", "lenCaSomBatDau", "lenCaSomKetThuc")}
            {renderRow("Xuống ca", "tanCaSomBatDau", "tanCaSomKetThuc")}
          </div>
        </div>

        {/* Ca muộn */}
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="font-medium text-amber-500 mb-2">Ca muộn</div>
          <div className="space-y-2 text-sm">
            {renderRow("Lên ca", "lenCaMuonBatDau", "lenCaMuonKetThuc")}
            {renderRow("Xuống ca", "tanCaMuonBatDau", "tanCaMuonKetThuc")}
          </div>
        </div>
      </div>

      {/* Giờ nghỉ + Tổng giờ hành chính */}
      {/* === HÀNG GIỜ NGHỈ & GIỜ HÀNH CHÍNH === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 items-stretch">
        {/* --- KHUNG GIỜ NGHỈ --- */}
        <div
          onClick={() => handleOpenPopup("nghiGiuaCa", current.nghiGiuaCa)}
          className="cursor-pointer border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <div className="flex items-center gap-2">
            ☕ Giờ nghỉ:
            <span className="font-semibold">
              {current.nghiGiuaCa ? `${current.nghiGiuaCa} tiếng` : "--"}
            </span>
          </div>
          <Edit3 size={16} />
        </div>
        {/* --- KHUNG TỔNG GIỜ HÀNH CHÍNH --- */}
        <div
          className={`border rounded-lg p-4 flex flex-col justify-center ${
            calcOffice().error
              ? "border-red-500 bg-red-50 dark:bg-red-900/30"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          }`}
        >
          {!calcOffice().error ? (
            <div className="text-base font-semibold text-blue-600 dark:text-blue-400 text-center">
              Giờ hành chính: {calcOffice().value}
            </div>
          ) : (
            <>
              <div className="text-base font-semibold text-red-600 dark:text-red-400 text-center">
                Giờ hành chính Lỗi
              </div>
            </>
          )}
        </div>{" "}
      </div>

      {/* --- HÀNG NÚT LƯU --- */}
      <div className="flex justify-end mt-5">
        <button
          onClick={handleSave}
          className={`flex items-center justify-center gap-2 rounded-lg px-5 py-2 font-semibold text-white shadow-md transition ${
            config.shiftType === "day"
              ? "bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90"
          }`}
        >
          <Save size={18} />
          {config.shiftType === "day" ? "Lưu ca ngày" : "Lưu ca đêm"}
        </button>
      </div>

      {/* --- KHỐI TRẠNG THÁI (nằm hàng dưới) --- */}
      <div className="mt-3 w-full">
        {!calcOffice().error ? (
          <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold text-xs border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 rounded-lg px-3 py-1">
            <span className="text-base">🟢</span>
            <span>Trạng thái: Hợp lệ</span>
          </div>
        ) : (
          <div className="border border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-1 text-red-600 dark:text-red-400 text-xs leading-snug max-w-[520px]">
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-base">🔴</span>
              <span>Trạng thái: Sai</span>
            </div>
            <div className="mt-1 border-t border-red-300 dark:border-red-700 pt-1">
              {calcOffice().msg}
            </div>
          </div>
        )}
      </div>

      {/* Popup nhập giờ thủ công */}
      {popup.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-80">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-indigo-600 dark:text-indigo-400">
                Nhập giờ
              </h4>
              <button onClick={() => setPopup({ open: false })}>
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={popup.value}
              onChange={(e) =>
                setPopup((prev) => ({ ...prev, value: e.target.value }))
              }
              onKeyDown={handlePopupKeyDown}
              placeholder="VD: 1 hoặc 1.5"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              onClick={handlePopupSave}
              className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg hover:opacity-90"
            >
              Lưu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
