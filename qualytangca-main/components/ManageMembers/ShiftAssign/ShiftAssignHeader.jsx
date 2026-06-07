import React from "react";
import { CalendarDays, X } from "lucide-react";

export default function ShiftAssignHeader({ selectedMonth, selectedYear, onClose }) {
  return (
    <div
      className="
        -mx-6 -mt-6 px-6 py-4 rounded-t-2xl
        bg-gradient-to-r from-[#6C4DFF] to-[#A855F7]
        flex items-center justify-between
        text-white
      "
    >
      <div className="flex items-center gap-3 text-lg font-semibold">
        <CalendarDays className="w-5 h-5" />
        Phân ca tháng {selectedMonth}/{selectedYear}
      </div>

      <button onClick={onClose} className="hover:scale-110 transition">
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}
