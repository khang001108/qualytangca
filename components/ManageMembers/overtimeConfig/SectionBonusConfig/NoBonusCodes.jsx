import React from "react";
// import { LEAVE_CODES } from "../../../../hooks/useOvertimeParser/parseHelpers";
import { LEAVE_CODES } from "../../../../hooks/useOvertimeParser/parseHelpers";



export default function NoBonusCodes({
  merged,
  handleChange,
  newCode,
  setNewCode,
}) {
  const addNoBonusCode = () => {
    const code = newCode.trim();
    if (!code) return;
    if (LEAVE_CODES.includes(code) || merged.customNoBonus.includes(code)) {
      alert("Mã đã tồn tại trong danh sách không được thưởng.");
      return;
    }
    handleChange("customNoBonus", [...merged.customNoBonus, code]);
    setNewCode("");
  };

  const removeCode = (code) =>
    handleChange(
      "customNoBonus",
      merged.customNoBonus.filter((c) => c !== code)
    );

  return (
    <div className="border-t border-gray-300 dark:border-gray-700 pt-3">
      <p className="font-medium text-gray-800 dark:text-gray-100 mb-1">
        ⚠️ Các trường hợp không được thưởng:
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs">
        {[...LEAVE_CODES, ...merged.customNoBonus].map((code, i) => (
          <div key={i} className="flex justify-between pr-2">
            <span>
              {i + 1}. {code}
            </span>
            {merged.customNoBonus.includes(code) && (
              <button
                onClick={() => removeCode(code)}
                className="text-red-500 hover:underline text-[11px]"
              >
                xoá
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          type="text"
          placeholder="Thêm mã mới..."
          className="flex-1 text-xs px-2 py-1 border rounded dark:bg-gray-800 dark:text-gray-100"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNoBonusCode()}
        />
        <button
          onClick={addNoBonusCode}
          className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
        >
          Thêm
        </button>
      </div>
    </div>
  );
}
