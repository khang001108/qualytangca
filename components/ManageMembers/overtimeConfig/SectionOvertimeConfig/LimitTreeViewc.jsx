// components/ManageMembers/overtimeConfig/SectionOvertimeConfig/LimitTreeView.jsx
// Hiển thị cây nhóm nhân viên theo giới hạn tăng ca và tùy chọn phân bổ ngày/hàng ngày


import React from "react";
import { ChevronRight, ChevronDown, Users } from "lucide-react";

export default function LimitTreeView({
  tree,
  loading,
  selectedOption,
  setSelectedOption,
  openGroups,
  setOpenGroups,
}) {
  const toggleGroup = (key) =>
    setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const sortedLimits = Object.keys(tree)
    .map(Number)
    .sort((a, b) => b - a)
    .map(String);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getMonthSplitOptions = (monthlyLimit) => {
    const opts = [];
    for (let h = 6; h >= 1; h--) {
      const d = monthlyLimit / h;
      if (Number.isInteger(d) && d <= daysInMonth)
        opts.push({ perDay: h, days: d });
    }
    if (!opts.length) {
      for (let h = 6; h >= 1; h--) {
        const d = Math.ceil(monthlyLimit / h);
        if (d <= daysInMonth) opts.push({ perDay: h, days: d });
      }
    }
    return opts.sort((a, b) => b.days - a.days);
  };

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-900 p-3 space-y-3">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Số giờ tăng ca / ngày (hệ thống)
          </div>
          <div className="text-sm text-gray-500">
            Quy tắc: 1h sau tan ca = 1h tăng ca
          </div>
        </div>
        <div className="text-xs text-gray-400">
          Tháng {month + 1}/{year} có {daysInMonth} ngày
        </div>
      </div>

      <div
        className="space-y-2 overflow-y-auto pr-1 mt-2"
        style={{ maxHeight: "180px", scrollbarWidth: "thin" }}
      >
        {loading ? (
          <p className="text-gray-400 text-sm italic">Đang tải danh sách...</p>
        ) : sortedLimits.length === 0 ? (
          <div className="text-sm text-gray-500">Không có nhân viên.</div>
        ) : (
          sortedLimits.map((limitKey) => {
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
                      Giới hạn {limitNum}h
                    </span>
                    <span className="text-sm text-gray-400 ml-2">
                      → {chosen.days} ngày × {chosen.perDay}h/ngày
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Users className="w-4 h-4" /> {members.length}
                  </div>
                </button>

                <div className="px-4 py-2 border-t border-gray-700 bg-gray-900/40">
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, i) => {
                      const active =
                        chosen.perDay === opt.perDay &&
                        chosen.days === opt.days;
                      return (
                        <button
                          key={i}
                          onClick={() =>
                            setSelectedOption((p) => ({
                              ...p,
                              [limitKey]: opt,
                            }))
                          }
                          className={`px-2 py-1 rounded-lg text-xs border ${
                            active
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
                          }`}
                        >
                          {opt.days} ngày × {opt.perDay}h
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isOpen && (
                  <ul className="px-4 py-2 border-t border-gray-700 text-sm space-y-1">
                    {members.map((m) => {
                      const name = m.nickname || m.realName || "Không tên";
                      const worked = m.overtimeLimit?.workedHours || 0;
                      const remaining = Math.max(limitNum - worked, 0);
                      const remainDays = Math.ceil(
                        remaining / chosen.perDay
                      );
                      return (
                        <li
                          key={m.id}
                          className="flex justify-between border-b border-gray-700/50 pb-1"
                        >
                          <div>
                            <div className="text-green-400">{name}</div>
                            <div className="text-xs text-gray-400">
                              Đã làm: {worked}h · Còn: {remaining}h
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-400">
                            {remainDays} ngày ({remaining}h)
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
