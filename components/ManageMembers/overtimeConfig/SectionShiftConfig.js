import React, { useState } from "react";
import { Settings } from "lucide-react";

export default function SectionShiftConfig({ config, setConfig }) {
  const [popupType, setPopupType] = useState(null); // 'start' hoặc 'end'
  const [subType, setSubType] = useState("early"); // 'early' hoặc 'late'
  const [gapMinutes, setGapMinutes] = useState(15); // mặc định 15p
  const [labelRange, setLabelRange] = useState(""); // hiển thị khung giờ

  const shiftOptions = {
    day: { start: [7, 8] },
    night: { start: [19, 20] },
  };

  const calcOffice = (start, end, half) => {
    const duration = end > start ? end - start : 24 - start + end;
    return duration - half;
  };

  const getShiftEndOptions = (shiftType, startHour, shiftHalf = 1) => {
    const ends = [];
    const baseHours = 8 + shiftHalf;
    for (let extra = 0; extra <= 3; extra++) {
      ends.push((startHour + baseHours + extra) % 24);
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
        const end = getShiftEndOptions(
          prev.shiftType,
          value,
          prev.shiftHalf
        )[0];
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

  const openPopup = (type) => {
    setPopupType(type);
    setSubType("early");
    setGapMinutes(15);
    const [start, end] = getDefaultTime(config.shiftType, type, "early", 15);
    setLabelRange(`${convertToTime(start)} – ${convertToTime(end)}`);
  };

  const handleSubtypeChange = (mode) => {
    setSubType(mode);
    const [start, end] = getDefaultTime(
      config.shiftType,
      popupType,
      mode,
      gapMinutes
    );
    setLabelRange(`${convertToTime(start)} – ${convertToTime(end)}`);
  };

  const handleGapChange = (val) => {
    setGapMinutes(val);
    const [start, end] = getDefaultTime(
      config.shiftType,
      popupType,
      subType,
      val
    );
    setLabelRange(`${convertToTime(start)} – ${convertToTime(end)}`);
  };

  const handleSave = () => {
    const keyPrefix = `${subType}${popupType === "start" ? "Start" : "End"}`;
    const [start, end] = getDefaultTime(
      config.shiftType,
      popupType,
      subType,
      gapMinutes
    );
    setConfig((prev) => ({
      ...prev,
      [`${keyPrefix}From`]: start,
      [`${keyPrefix}To`]: end,
      [`${popupType}Mode`]: subType,
      [`${popupType}Gap`]: gapMinutes,
    }));
    setPopupType(null);
  };

  const shiftEndOptions = getShiftEndOptions(
    config.shiftType,
    config.shiftStart,
    config.shiftHalf
  );

  // Tính nhãn động cho giờ sớm
  const getDynamicLabels = () => {
    const gap = 15 / 60;
    const startEarlyFrom = convertToTime(
      config.shiftStart - gap < 0
        ? 24 + (config.shiftStart - gap)
        : config.shiftStart - gap
    );
    const startEarlyTo = convertToTime(config.shiftStart);
    const endEarlyFrom = convertToTime(config.shiftEnd + 1 / 60);
    const endEarlyTo = convertToTime(config.shiftEnd + 16 / 60);
    return {
      start: `(${startEarlyFrom}–${startEarlyTo})`,
      end: `(${endEarlyFrom}–${endEarlyTo})`,
    };
  };

  const labels = getDynamicLabels();

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
        🕒 Giờ hành chính
      </h3>

      {/* Loại ca */}
      <div>
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Loại ca
        </label>
        <select
          className="w-full rounded-lg border p-2 dark:bg-gray-800 dark:text-gray-100"
          value={config.shiftType}
          onChange={(e) => handleChange("shiftType", e.target.value)}
        >
          <option value="day">🌤️ Ca ngày</option>
          <option value="night">🌙 Ca đêm</option>
        </select>
      </div>

      {/* Giờ lên / ra ca */}
      <div className="grid grid-cols-2 gap-3">
        {/* Giờ lên ca */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Giờ lên ca <span className="text-gray-500">{labels.start}</span>
            </label>
            <Settings
              onClick={() => openPopup("start")}
              title="Cài đặt giờ lên ca sớm / muộn"
              className="w-4 h-4 text-gray-500 cursor-pointer hover:text-indigo-600"
            />
          </div>
          <select
            className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:text-gray-100"
            value={config.shiftStart}
            onChange={(e) => handleChange("shiftStart", Number(e.target.value))}
          >
            {shiftOptions[config.shiftType].start.map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </div>

        {/* Giờ xuống ca */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Giờ xuống ca <span className="text-gray-500">{labels.end}</span>
            </label>
            <Settings
              onClick={() => openPopup("end")}
              title="Cài đặt giờ tan ca sớm / muộn"
              className="w-4 h-4 text-gray-500 cursor-pointer hover:text-indigo-600"
            />
          </div>
          <select
            className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:text-gray-100"
            value={config.shiftEnd}
            onChange={(e) => handleChange("shiftEnd", Number(e.target.value))}
          >
            {shiftEndOptions.map((h, idx) => (
              <option key={idx} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Nghỉ giữa ca */}
      <div>
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Giờ nghỉ giữa ca
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:text-gray-100"
          value={config.shiftHalf}
          onChange={(e) => handleChange("shiftHalf", Number(e.target.value))}
        />
      </div>

      {/* Tổng giờ */}
      <div className="flex justify-between bg-gray-100 dark:bg-gray-900 p-2 rounded-lg border">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Tổng giờ hành chính
        </span>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
          {config.shiftOffice} tiếng
        </span>
      </div>

      {/* Popup ⚙️ chỉnh chi tiết */}
      {popupType && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setPopupType(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-2xl w-72 space-y-3"
          >
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
              ⚙️ {popupType === "start" ? "Giờ lên ca" : "Giờ tan ca"} (
              {config.shiftType === "day" ? "Ca ngày" : "Ca đêm"})
            </h4>

            <div className="flex justify-center gap-3 mb-2">
              <button
                onClick={() => handleSubtypeChange("early")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  subType === "early"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                }`}
              >
                Sớm
              </button>
              <button
                onClick={() => handleSubtypeChange("late")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  subType === "late"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                }`}
              >
                Muộn
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Chênh (phút)
              </label>
              <select
                className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:text-gray-100"
                value={gapMinutes}
                onChange={(e) => handleGapChange(Number(e.target.value))}
              >
                {[30, 20, 15, 10].map((m) => (
                  <option key={m} value={m}>
                    {m} phút
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center text-sm text-gray-700 dark:text-gray-300">
              {subType === "early" ? "Khung sớm" : "Khung muộn"}:{" "}
              <span className="font-semibold text-indigo-600">
                {labelRange}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setPopupType(null)}
                className="px-4 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Logic chuẩn theo yêu cầu ===
function getDefaultTime(shiftType, type, mode, gap = 15) {
  const gapHours = gap / 60;
  const oneMin = 1 / 60;
  const oneHour = 1.0;

  if (type === "start") {
    if (shiftType === "day") {
      return mode === "early" ? [7 - gapHours, 7.0] : [7.0 + gapHours, 8.0];
    } else {
      return mode === "early" ? [19 - gapHours, 19.0] : [19.0 + gapHours, 20.0];
    }
  } else {
    if (shiftType === "day") {
      const base = 16.0;
      return mode === "early"
        ? [base + oneMin, base + oneMin + gapHours]
        : [base + oneHour + oneMin, base + oneHour + oneMin + gapHours];
    } else {
      const base = 4.0;
      return mode === "early"
        ? [base + oneMin, base + oneMin + gapHours]
        : [base + oneHour + oneMin, base + oneHour + oneMin + gapHours];
    }
  }
}

function convertToTime(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
