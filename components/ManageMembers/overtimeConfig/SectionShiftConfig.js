import React from "react";

export default function SectionShiftConfig({ config, setConfig }) {
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

  const shiftEndOptions = getShiftEndOptions(
    config.shiftType,
    config.shiftStart,
    config.shiftHalf
  );

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">🕒 Giờ hành chính</h3>
      <div>
        <label className="text-sm text-gray-700 dark:text-gray-300">Loại ca</label>
        <select
          className="w-full rounded-lg border p-2 dark:bg-gray-800 dark:text-gray-100"
          value={config.shiftType}
          onChange={(e) => handleChange("shiftType", e.target.value)}
        >
          <option value="day">🌤️ Ca ngày</option>
          <option value="night">🌙 Ca đêm</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Giờ lên ca</label>
          <select
            className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:text-gray-100"
            value={config.shiftStart}
            onChange={(e) => handleChange("shiftStart", Number(e.target.value))}
          >
            {shiftOptions[config.shiftType].start.map((h) => (
              <option key={h} value={h}>{h}:00</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700 dark:text-gray-300">Giờ xuống ca</label>
          <select
            className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:text-gray-100"
            value={config.shiftEnd}
            onChange={(e) => handleChange("shiftEnd", Number(e.target.value))}
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
        <label className="text-sm text-gray-700 dark:text-gray-300">Giờ nghỉ giữa ca</label>
        <input
          type="number"
          step="0.5"
          min="0"
          className="w-full border rounded-lg p-2 dark:bg-gray-800 dark:text-gray-100"
          value={config.shiftHalf}
          onChange={(e) => handleChange("shiftHalf", Number(e.target.value))}
        />
      </div>
      <div className="flex justify-between bg-gray-100 dark:bg-gray-900 p-2 rounded-lg border">
        <span className="text-sm text-gray-700 dark:text-gray-300">Tổng giờ hành chính</span>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
          {config.shiftOffice} tiếng
        </span>
      </div>
    </div>
  );
}
