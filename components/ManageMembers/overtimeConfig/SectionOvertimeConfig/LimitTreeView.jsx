import React, { useState } from "react";
import { ChevronRight, ChevronDown, Users } from "lucide-react";

export default function LimitTreeView({ tree, loading }) {
  const [selectedOption, setSelectedOption] = useState({});
  const [openGroups, setOpenGroups] = useState({});

  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const sortedLimits = Object.keys(tree)
    .map(Number)
    .sort((a, b) => b - a)
    .map(String);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const getMonthSplitOptions = (monthlyLimit) => {
    const options = [];
    for (let h = 6; h >= 1; h--) {
      const d = monthlyLimit / h;
      if (Number.isInteger(d) && d <= daysInMonth) options.push({ perDay: h, days: d });
    }
    return options;
  };

  if (loading)
    return <p className="text-gray-400 text-sm italic">Đang tải danh sách...</p>;

  return (
    <div className="space-y-2">
      {sortedLimits.map((limitKey) => {
        const members = tree[limitKey] || [];
        const limitNum = Number(limitKey);
        const options = getMonthSplitOptions(limitNum);
        const chosen = selectedOption[limitKey] || options[0];
        const isOpen = openGroups[limitKey] ?? false;

        return (
          <div
            key={limitKey}
            className="border border-gray-700/30 rounded-lg bg-gray-800/70 overflow-hidden"
          >
            <button
              onClick={() => toggleGroup(limitKey)}
              className="flex justify-between items-center w-full px-3 py-2 text-left hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                )}
                <span className="font-medium text-amber-300">
                  Giới hạn {limitNum} giờ
                </span>
                {chosen && (
                  <span className="text-sm text-gray-400 ml-2">
                    → {chosen.days} ngày × {chosen.perDay}h/ngày
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Users className="w-4 h-4" /> {members.length}
              </div>
            </button>

            {isOpen && (
              <ul className="px-4 py-2 border-t border-gray-700 text-sm space-y-1">
                {members.map((m) => (
                  <li key={m.id} className="flex justify-between border-b border-gray-700/50 pb-1">
                    <div>
                      <div className="text-green-400">{m.nickname || m.realName}</div>
                      <div className="text-xs text-gray-400">
                        Giới hạn: {limitNum}h
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
