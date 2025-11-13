import React from "react";
import { Sun, Moon } from "lucide-react";

export default function ShiftAssignShiftSelector({ shiftType, setShiftType }) {
  return (
    <div className="flex justify-center gap-4 my-5 select-none">

      {/* Ca ngày */}
      <button
        onClick={() => setShiftType("day")}
        className={`
          flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold 
          transition shadow-sm border
          ${shiftType === "day"
            ? "bg-[#7A5AF8] border-[#7A5AF8] text-white shadow-md"
            : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"} 
        `}
      >
        <Sun className="w-5 h-5" />
        Ca ngày
      </button>

      {/* Ca đêm */}
      <button
        onClick={() => setShiftType("night")}
        className={`
          flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold 
          transition shadow-sm border
          ${shiftType === "night"
            ? "bg-[#7A5AF8] border-[#7A5AF8] text-white shadow-md"
            : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"} 
        `}
      >
        <Moon className="w-5 h-5" />
        Ca đêm
      </button>
    </div>
  );
}
