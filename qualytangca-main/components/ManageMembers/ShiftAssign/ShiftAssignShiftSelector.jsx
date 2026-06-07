import React from "react";
import { Sun, Moon } from "lucide-react";

export default function ShiftAssignShiftSelector({ shiftType, setShiftType }) {
  return (
    <div className="flex justify-start gap-3 mt-3 mb-2 select-none">
      {/* Ca ngày */}
      <button
        onClick={() => setShiftType("day")}
        className={`
          flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium
          transition shadow-sm border text-sm
          ${
            shiftType === "day"
              ? "bg-[#FFDB2B] border-[#B69722] text-white shadow-md"
              : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          }
        `}
      >
        <Sun className="w-4 h-4" />
        Ca ngày
      </button>

      {/* Ca đêm */}
      <button
        onClick={() => setShiftType("night")}
        className={`
          flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium
          transition shadow-sm border text-sm
          ${
            shiftType === "night"
              ? "bg-[#7A5AF8] border-[#7A5AF8] text-white shadow-md"
              : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          }
        `}
      >
        <Moon className="w-4 h-4" />
        Ca đêm
      </button>
    </div>
  );
}
