import React from "react";

export default function NoLimitView({ shiftConfig, defaultDailyCap }) {
  const formatTime = (t) => t || "--:--";

  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const totalHours = days * defaultDailyCap;

  const day = shiftConfig?.day || {};
  const night = shiftConfig?.night || {};

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-4 space-y-5 shadow-sm">
      {/* === Ca ngày === */}
      <div>
        <div className="text-amber-500 font-semibold mb-2">Ca ngày</div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 w-full sm:w-auto">
            <span className="text-sm">Tan ca sớm</span>
            <span className="ml-3 text-sm font-semibold text-indigo-400">
              {formatTime(day.lenCaSomKetThuc)}
            </span>
          </button>

          <button className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 w-full sm:w-auto">
            <span className="text-sm">Tan ca muộn</span>
            <span className="ml-3 text-sm font-semibold text-indigo-400">
              {formatTime(day.lenCaMuonKetThuc)}
            </span>
          </button>
        </div>
      </div>

      {/* === Ca đêm === */}
      <div>
        <div className="text-amber-500 font-semibold mb-2">Ca đêm</div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 w-full sm:w-auto">
            <span className="text-sm">Tan ca sớm (đêm)</span>
            <span className="ml-3 text-sm font-semibold text-indigo-400">
              {formatTime(night.lenCaSomKetThuc)}
            </span>
          </button>

          <button className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 w-full sm:w-auto">
            <span className="text-sm">Tan ca muộn (đêm)</span>
            <span className="ml-3 text-sm font-semibold text-indigo-400">
              {formatTime(night.lenCaMuonKetThuc)}
            </span>
          </button>
        </div>
      </div>

      {/* === Thông tin tổng === */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Kế hoạch tăng ca tháng này
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Giới hạn/ngày
            </div>
            <div className="text-lg font-semibold text-indigo-500 dark:text-indigo-400">
              ≤ {defaultDailyCap} h
            </div>
          </div>

          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Số ngày trong tháng
            </div>
            <div className="text-lg font-semibold text-gray-700 dark:text-gray-100">
              {days} ngày
            </div>
          </div>

          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 col-span-2 sm:col-span-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tổng giờ tối đa
            </div>
            <div className="text-lg font-semibold text-amber-500">
              {totalHours} h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
