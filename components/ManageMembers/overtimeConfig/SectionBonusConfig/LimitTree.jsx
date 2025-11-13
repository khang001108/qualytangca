import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function LimitTree({
  limitTree,
  openGroups,
  selectedLimits,
  toggleGroup,
  toggleLimit,
}) {
  const keys = Object.keys(limitTree)
    .map(Number)
    .sort((a, b) => b - a)
    .map(String);

  return (
    <div className="border-t border-gray-500 dark:border-gray-700 pt-3">
      <p className="font-medium text-gray-800 dark:text-gray-100 mb-2">
        🌿 Chọn nhánh áp dụng thưởng:
      </p>

      <div className="space-y-2 text-sm">
        {keys.length === 0 && (
          <div className="text-gray-500 text-xs">Đang tải cây giới hạn…</div>
        )}

        {keys.map((limitKey) => {
          const isOpen = openGroups[limitKey] ?? false;
          const isChecked = selectedLimits.includes(limitKey);
          const members = limitTree[limitKey] || [];

          return (
            <div
              key={limitKey}
              className="border border-gray-400/40 rounded-md bg-white/40 dark:bg-gray-800/40"
            >
              <div className="flex justify-between items-center px-2 py-1">
                <div className="flex items-center gap-2">
                  {/* Toggle open/close */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(limitKey)}
                    className="text-amber-400"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {/* Checkbox */}
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleLimit(limitKey)}
                      className="w-3 h-3 accent-amber-500"
                    />
                    <span className="font-medium text-amber-500">
                      Giới hạn {limitKey} giờ
                    </span>
                  </label>
                </div>

                <span className="text-xs text-gray-500">
                  {members.length} nhân viên
                </span>
              </div>

              {/* List members */}
              {isOpen && (
                <ul className="pl-6 pb-2 text-xs text-gray-700 dark:text-gray-200 space-y-0.5">
                  {members.length > 0 ? (
                    members.map((m) => (
                      <li key={m.id} className="truncate">
                        • {m.name}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 italic">Không có nhân viên</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
