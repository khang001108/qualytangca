// components/ManageMembers/overtimeConfig/SectionShiftConfig/index.jsx
import React, { useState, useEffect } from "react";
import { Sun, Moon, Save, Edit3, X } from "lucide-react";
import { useShiftFirestore } from "./useShiftFirestore";

export default function SectionShiftConfig({ config, setConfig, onDataChange }) {
  const { fetchConfig, saveConfig } = useShiftFirestore(setConfig);
  const [popup, setPopup] = useState({ open: false, field: "", value: "" });

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const current = config[config.shiftType] || {};

  const parseTime = (t) => {
    if (!t) return 0;
    const [h, m] = String(t)
      .replace(/[^\d:]/g, "")
      .split(":")
      .map(Number);
    return (h || 0) + (m || 0) / 60;
  };

  const calcOffice = () => {
    const rest = parseFloat(current.nghiGiuaCa || 0);
    const calc = (start, end) => {
      let d = parseTime(end) - parseTime(start);
      if (d < 0) d += 24;
      return d - rest;
    };
    const early = calc(current.lenCaSomKetThuc, current.tanCaSomBatDau);
    const late = calc(current.lenCaMuonKetThuc, current.tanCaMuonBatDau);
    const diff = Math.abs(early - late);

    const fmt = (h) => {
      const m = Math.round(h * 60);
      const hh = Math.floor(m / 60);
      const mm = m % 60;
      return mm > 0 ? `${hh} tiếng ${mm} phút` : `${hh} tiếng`;
    };

    if (diff > 0.01)
      return {
        error: true,
        msg: `Ca muộn khác ca sớm ${fmt(early)} ≠ ${fmt(late)}.`,
      };

    return { error: false, value: fmt(early), hours: early };
  };

  const handleSave = () => {
    const office = calcOffice();
    const updated = { ...config };
    updated[config.shiftType].tongGioHanhChinh = office.error
      ? 0
      : Math.round(office.hours * 100) / 100;
    saveConfig(updated);
  };

  const handleOpenPopup = (field, val) =>
    setPopup({ open: true, field, value: val || "" });

  const handlePopupSave = () => {
    if (!popup.field) return;
    setConfig((prev) => {
      const t = prev.shiftType;
      return {
        ...prev,
        [t]: { ...prev[t], [popup.field]: popup.value },
      };
    });
    setPopup({ open: false, field: "", value: "" });
  };

  const handleKey = (e) => e.key === "Enter" && handlePopupSave();

  const renderRow = (label, a, b) => (
    <div className="flex justify-between bg-white dark:bg-gray-900 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 items-center">
      <span>{label}:</span>
      <div className="flex items-center gap-2">
        <span
          onClick={() => handleOpenPopup(a, current[a])}
          className="font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center gap-1"
        >
          {current[a] || "--:--"}
        </span>

        <span className="text-gray-400">–</span>

        <span
          onClick={() => handleOpenPopup(b, current[b])}
          className="font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center gap-1"
        >
          {current[b] || "--:--"}
        </span>
      </div>
    </div>
  );

  const office = calcOffice();

  // -------------------------
  // helper convert "HH:MM" => float hours
  // -------------------------
  const toHours = (t) => {
    if (t === undefined || t === null || t === "") return 0;
    const s = String(t).trim();
    if (!s.includes(":")) {
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    const [hRaw, mRaw] = s.replace(/[^\d:]/g, "").split(":");
    const h = Number(hRaw) || 0;
    const m = Number(mRaw) || 0;
    return h + m / 60;
  };

  // Emit shift data to parent once when relevant inputs change
  useEffect(() => {
    if (typeof onDataChange === "function") {
      const s_lenStart = toHours(current.lenCaSomBatDau);
      const s_lenEnd = toHours(current.lenCaSomKetThuc);
      const s_tanStart = toHours(current.tanCaSomBatDau);

      const l_lenStart = toHours(current.lenCaMuonBatDau);
      const l_lenEnd = toHours(current.lenCaMuonKetThuc);
      const l_tanStart = toHours(current.tanCaMuonBatDau);

      onDataChange({
        shiftType: config.shiftType,
        // numeric hours for calculations
        start: s_lenStart,
        end: s_tanStart,
        startLate: l_lenStart,
        endLate: l_tanStart,
        // raw strings for UI if needed
        startRaw: current.lenCaSomBatDau || "",
        endRaw: current.tanCaSomBatDau || "",
        rest: Number(current.nghiGiuaCa || 0),
        officeHours: office.error ? 0 : Math.round(office.hours * 100) / 100,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.shiftType, JSON.stringify(current), office.error, office.hours]);

  return (
    <div className="border border-gray-300 dark:border-gray-500 rounded-2xl p-6 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
          🕒 Giờ hành chính
        </h3>
        <div
          onClick={() =>
            setConfig((p) => ({
              ...p,
              shiftType: p.shiftType === "day" ? "night" : "day",
            }))
          }
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

      {/* Ca sớm / muộn */}
      <div className="grid md:grid-cols-2 gap-4">
        {["Ca sớm", "Ca muộn"].map((title, i) => (
          <div
            key={i}
            className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
          >
            <div className="font-medium text-amber-500 mb-2">{title}</div>
            <div className="space-y-2 text-sm">
              {renderRow(
                "Lên ca",
                i ? "lenCaMuonBatDau" : "lenCaSomBatDau",
                i ? "lenCaMuonKetThuc" : "lenCaSomKetThuc"
              )}
              {renderRow(
                "Xuống ca",
                i ? "tanCaMuonBatDau" : "tanCaSomBatDau",
                i ? "tanCaMuonKetThuc" : "tanCaSomKetThuc"
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Giờ nghỉ & tổng giờ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div
          onClick={() => handleOpenPopup("nghiGiuaCa", current.nghiGiuaCa)}
          className="cursor-pointer border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-indigo-600 dark:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ☕ Giờ nghỉ:{" "}
          <span className="font-semibold">
            {current.nghiGiuaCa ? `${current.nghiGiuaCa} tiếng` : "--"}
          </span>
          <Edit3 size={16} />
        </div>

        <div
          className={`border rounded-lg p-4 text-center ${
            office.error
              ? "border-red-500 bg-red-50 dark:bg-red-900/30"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          }`}
        >
          <div
            className={`font-semibold ${
              office.error
                ? "text-red-600 dark:text-red-400"
                : "text-blue-600 dark:text-blue-400"
            }`}
          >
            Giờ hành chính: {office.value}
          </div>
        </div>
      </div>

      {/* Nút lưu */}
      <div className="flex justify-end mt-5">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-white shadow-md transition ${
            config.shiftType === "day"
              ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
              : "bg-gradient-to-r from-indigo-500 to-indigo-600"
          } hover:opacity-90`}
        >
          <Save size={18} />
          {config.shiftType === "day" ? "Lưu ca ngày" : "Lưu ca đêm"}
        </button>
      </div>

      {/* Trạng thái */}
      <div className="mt-3">
        {!office.error ? (
          <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold text-xs border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 rounded-lg px-3 py-1">
            🟢 Hợp lệ
          </div>
        ) : (
          <div className="border border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-1 text-red-600 dark:text-red-400 text-xs max-w-[520px]">
            🔴 Sai: {office.msg}
          </div>
        )}
      </div>

      {/* Popup nhập giờ */}
      {popup.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg w-80">
            <div className="flex justify-between mb-3">
              <h4 className="font-semibold text-indigo-600 dark:text-indigo-400">
                Nhập giờ
              </h4>
              <button onClick={() => setPopup({ open: false })}>
                <X size={18} />
              </button>
            </div>
            <input
              value={popup.value}
              onChange={(e) =>
                setPopup((p) => ({ ...p, value: e.target.value }))
              }
              onKeyDown={handleKey}
              placeholder="VD: 1 hoặc 1.5 hoặc 07:30"
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500"
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
