import React, { useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";

export default function BranchPopup({
  tree,
  loadingTree,
  showToast,
  setShowBranchPopup,
  selectedLimitKey,
  setSelectedLimitKey,
  selectedLimitOption,
  setSelectedLimitOption,
}) {
  const [openGroups, setOpenGroups] = useState({});
  const [tempKey, setTempKey] = useState(selectedLimitKey);
  const [tempOption, setTempOption] = useState(selectedLimitOption);
  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const getMonthSplitOptions = (monthlyLimit) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const opts = [];
    for (let h = 6; h >= 1; h--) {
      const d = monthlyLimit / h;
      if (Number.isInteger(d) && d <= daysInMonth) opts.push({ perDay: h, days: d });
    }
    if (!opts.length) {
      for (let h = 6; h >= 1; h--) {
        const d = Math.ceil(monthlyLimit / h);
        if (d <= daysInMonth) opts.push({ perDay: h, days: d });
      }
    }
    return opts.sort((a, b) => b.days - a.days);
  };

  const sortedLimitKeys = Object.keys(tree)
    .map(Number)
    .sort((a, b) => b - a)
    .map(String);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onMouseDown={() => setShowBranchPopup(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl p-4 w-[520px] max-w-[95%] max-h-[80vh] overflow-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold text-indigo-600">Chọn nhánh tăng ca</div>
            <div className="text-xs text-gray-500">
              Nhóm theo giới hạn giờ/tháng. Chọn nhánh và phương án.
            </div>
          </div>
          <div className="text-xs text-gray-400">Tháng {month}/{year}</div>
        </div>

        {loadingTree ? (
          <div>Đang tải...</div>
        ) : sortedLimitKeys.length === 0 ? (
          <div>Không có nhánh.</div>
        ) : (
          sortedLimitKeys.map((limitKey) => {
            const members = tree[limitKey] || [];
            const isOpen = openGroups[limitKey] ?? false;
            const options = getMonthSplitOptions(Number(limitKey));
            const isThisTempGroup = tempKey === limitKey;

            return (
              <div
                key={limitKey}
                className="border border-gray-700/20 rounded-lg overflow-hidden mb-2"
              >
                <button
                  onClick={() => toggleGroup(limitKey)}
                  className="w-full flex justify-between items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-amber-400" />
                    )}
                    <div>
                      <div className="font-medium text-amber-300">Giới hạn {limitKey}h</div>
                      <div className="text-xs text-gray-400">{members.length} người</div>
                    </div>
                  </div>
                  <Users className="w-4 h-4 text-gray-400" />
                </button>

                {isOpen && (
                  <div className="px-4 py-2 border-t bg-gray-50 dark:bg-gray-800">
                    <ul className="text-sm space-y-1">
                      {members.map((m) => (
                        <li
                          key={m.id}
                          className="flex justify-between border-b border-gray-700/40 pb-1"
                        >
                          <span className="text-green-400">{m.nickname || m.realName}</span>
                          <span className="text-xs text-gray-400">
                            {m.overtimeLimit?.workedHours || 0}h
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {options.map((opt, i) => {
                        const active =
                          tempKey === limitKey &&
                          tempOption?.perDay === opt.perDay &&
                          tempOption?.days === opt.days;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setTempKey(limitKey);
                              setTempOption(opt);
                            }}
                            className={`px-2 py-1 rounded text-xs border ${
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
                )}
              </div>
            );
          })
        )}

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => setShowBranchPopup(false)}
            className="px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              if (!tempKey) {
                showToast("Chưa chọn nhánh.", "error");
                return;
              }
              setSelectedLimitKey(tempKey);
              setSelectedLimitOption(tempOption);
              setShowBranchPopup(false);
              showToast("✅ Đã chọn nhánh tăng ca.", "info");
            }}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
