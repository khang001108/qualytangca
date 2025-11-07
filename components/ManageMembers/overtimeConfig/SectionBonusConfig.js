import React from "react";

export default function SectionBonusConfig({ config, setConfig }) {
  const handleChange = (key, value) => setConfig((p) => ({ ...p, [key]: value }));

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-950/20 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">💰 Thưởng tăng ca</h3>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.bonusEnabled}
          onChange={(e) => handleChange("bonusEnabled", e.target.checked)}
          className="w-4 h-4 text-indigo-600"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Áp dụng thưởng tăng ca
        </span>
      </label>

      {config.bonusEnabled && (
        <div className="flex flex-wrap items-center gap-2 justify-between text-sm">
          <span>Mỗi</span>
          <input
            type="number"
            step="0.5"
            className="w-16 text-center border rounded dark:bg-gray-800 dark:text-gray-100"
            value={config.bonusEvery}
            onChange={(e) => handleChange("bonusEvery", Number(e.target.value))}
          />
          <span>tiếng tăng ca cộng</span>
          <input
            type="number"
            step="0.1"
            className="w-16 text-center border rounded dark:bg-gray-800 dark:text-gray-100"
            value={config.bonusAmount}
            onChange={(e) => handleChange("bonusAmount", Number(e.target.value))}
          />
          <span>giờ thưởng</span>
        </div>
      )}
    </div>
  );
}
