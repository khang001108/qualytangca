import React from "react";

export default function ShiftAssignCalendar({
  daysInMonth,
  assignMap,
  handleMouseDown,
  handleMouseEnter,
  loading,
}) {
  return (
    <div
      className="
        bg-gray-100 
        dark:bg-gray-500/40
        p-2 rounded-xl mb-4
        text-sm 
        text-gray-800 
        dark:text-gray-200
        transition
      "
    >
      {/* Thu nhỏ gap giữa ô */}
      <div className="grid grid-cols-7 gap-1 place-items-center">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const type = assignMap[day];

          const color =
            type === "day"
              ? "bg-yellow-400 text-black border-yellow-500 shadow"
              : type === "night"
                ? "bg-indigo-500 text-white border-indigo-600 shadow"
                : `
                bg-white 
                text-gray-700 
                dark:bg-gray-700/40 
                dark:text-gray-300 
                border-gray-300 
                dark:border-gray-600
              `;

          return (
            <button
              key={day}
              onMouseDown={(e) => handleMouseDown(day, e)}
              onMouseEnter={() => handleMouseEnter(day)}
              disabled={loading}
              className={`
  h-12 w-12
  text-base
  flex items-center justify-center
  rounded-xl border font-semibold 
  transition-all select-none
  hover:scale-[1.03]
  active:scale-[0.98]
  ${color}
`}

            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
