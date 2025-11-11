import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function LimitTree({
  limitTree,
  openGroups,
  selectedLimits,
  toggleGroup,
  toggleLimit,
}) {
  return (
    <div className="border-t border-gray-300 dark:border-gray-700 pt-3">
      <p className="font-medium text-gray-800 dark:text-gray-100 mb-1">
        🌿 Chọn nhánh giới hạn áp dụng thưởng:
      </p>
      <div className="space-y-2 text-sm">
        {Object.keys(limitTree).length === 0 && (
          <div className="text-gray-500 text-xs">Đang tải cây giới hạn...</div>
        )}
        {Object.entries(limitTree).map(([limitKey, members]) => {
          const isOpen = openGroups[limitKey] ?? false;
          const isChecked = selectedLimits.includes(limitKey);

          return (
            <div
              key={limitKey}
              className="border border-gray-400/40 rounded-md bg-white/30 dark:bg-gray-800/40"
            >
              <div className="flex justify-between items-center w-full px-2 py-1">
                <div className="flex items-center gap-2">
                  {/* Icon toggle chỉ mở/đóng, không ảnh hưởng checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(limitKey)}
                    className="text-indigo-400"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* Checkbox chỉ tick, không mở nhánh */}
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleLimit(limitKey)}
                      className="w-3 h-3 text-indigo-500"
                    />
                    <span className="font-medium text-indigo-500">
                      Giới hạn {limitKey}
                    </span>
                  </label>
                </div>

                <span className="text-xs text-gray-400">
                  {members.length} nhân viên
                </span>
              </div>

              {isOpen && (
                <ul className="pl-6 pb-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                  {members.map((m) => (
                    <li key={m.id} className="truncate">
                      • {m.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

          );
        })}
      </div>
    </div>
  );
}
