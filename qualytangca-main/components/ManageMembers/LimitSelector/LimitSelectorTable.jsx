// components/ManageMembers/LimitSelector/LimitSelectorTable.jsx
import React from "react";
import { ChevronUp } from "lucide-react";

export default function LimitSelectorTable({
  localMembers,
  selectedIds,
  toggleSelect,
  toggleAll,
  deleteMode,
  sortAsc,
  setSortAsc,
}) {
  const calcFullMonthLimit = () => {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return days * 6;
  };

  const fullLimit = calcFullMonthLimit();

  const statusOf = (m) => {
    const val = m.overtimeLimit?.monthlyLimit ?? fullLimit;
    return val < fullLimit
      ? { text: "Giới hạn", color: "text-green-500 font-semibold" }
      : { text: "Không giới hạn", color: "text-gray-400" };
  };

  const sorted = [...localMembers].sort((a, b) => {
    const aL = a.overtimeLimit?.monthlyLimit ?? fullLimit;
    const bL = b.overtimeLimit?.monthlyLimit ?? fullLimit;
    const aLimit = aL < fullLimit;
    const bLimit = bL < fullLimit;
    if (sortAsc) return aLimit === bLimit ? 0 : aLimit ? -1 : 1;
    return aLimit === bLimit ? 0 : aLimit ? 1 : -1;
  });

  return (
    <div className="px-6 mt-4">
      <div className="max-h-80 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm table-fixed">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="p-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length === sorted.length && sorted.length > 0
                  }
                  onChange={toggleAll}
                  className={
                    deleteMode ? "accent-red-500" : "accent-indigo-500"
                  }
                />
              </th>

              <th className="p-2 w-1/4">Tên nhân viên</th>
              <th className="p-2 w-1/4">Tên phụ</th>
              <th className="p-2 w-20">Giới hạn</th>

              <th
                className="p-2 cursor-pointer select-none"
                onClick={() => setSortAsc((p) => !p)}
              >
                <span className="flex items-center gap-1 justify-center">
                  Trạng thái
                  <ChevronUp
                    className={`w-4 h-4 transition ${
                      sortAsc ? "" : "rotate-180"
                    }`}
                  />
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-400">
                  Không có nhân viên
                </td>
              </tr>
            ) : (
              sorted.map((m) => {
                const limit = m.overtimeLimit?.monthlyLimit ?? fullLimit;
                const st = statusOf(m);

                return (
                  <tr
                    key={m.id}
                    onClick={() => toggleSelect(m.id)}
                    className={`
    border-t border-gray-200 dark:border-gray-700 cursor-pointer

    ${
      selectedIds.includes(m.id)
        ? deleteMode
          ? "bg-red-100 dark:bg-red-600/40" /* Nền đỏ khi xóa */
          : "bg-indigo-100 dark:bg-indigo-600/40" /* Nền xanh khi chọn */
        : "hover:bg-indigo-50 dark:hover:bg-gray-700"
    }
  `}
                  >
                    <td
                      className="p-2 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(m.id)}
                        onChange={() => toggleSelect(m.id)}
                        className={
                          deleteMode ? "accent-red-500" : "accent-indigo-500"
                        }
                      />
                    </td>

                    <td className="p-2">{m.realName}</td>
                    <td className="p-2">{m.nickname}</td>

                    <td className="p-2 text-center">{limit}h</td>

                    <td className={`p-2 text-center ${st.color}`}>{st.text}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
