import React from "react";

export default function SectionOvertimeConfig({ config }) {
  const daysRequired =
    config.bonusEnabled && config.bonusEvery > 0
      ? Math.floor(config.monthlyLimit / config.bonusEvery)
      : 0;

  const progress =
    config.monthlyLimit > 0
      ? Math.min((config.workedHours / config.monthlyLimit) * 100, 100)
      : 0;

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">⏱️ Giờ tăng ca</h3>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Giới hạn tháng:</span>
          <span className="font-semibold text-indigo-600">{config.monthlyLimit} tiếng</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Đã làm:</span>
          <span className="font-semibold text-green-500">{config.workedHours} tiếng</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Còn lại:</span>
          <span className="font-semibold text-amber-500">{config.remaining} tiếng</span>
        </div>

        <div className="mt-2 bg-gray-300 dark:bg-gray-700 rounded-full h-2">
          <div
            className="h-2 bg-indigo-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Hoàn thành {progress.toFixed(1)}% giới hạn tháng này.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 border rounded-lg p-2 flex justify-between text-sm">
        <span>Ngày cần tăng ca:</span>
        <span className="font-semibold text-amber-500">{daysRequired} ngày</span>
      </div>
    </div>
  );
}
