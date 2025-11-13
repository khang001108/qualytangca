// components/ManageMembers/ShiftAssign/ShiftAssignCalendar.jsx

export default function ShiftAssignCalendar({
  daysInMonth,
  assignMap,
  handleMouseDown,
  handleMouseEnter,
  loading,
}) {
  return (
    <>
      <div
        className={`grid grid-cols-7 gap-2 mb-4 transition ${
          loading ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const type = assignMap[day];

          const color =
            type === "day"
              ? "bg-yellow-400 text-white border-yellow-500"
              : type === "night"
              ? "bg-indigo-500 text-white border-indigo-600"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700";

          return (
            <button
              key={day}
              onMouseDown={(e) => handleMouseDown(day, e)}
              onMouseEnter={() => handleMouseEnter(day)}
              className={`py-2 rounded border font-medium transition select-none ${color}`}
              disabled={loading}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
        👉 Click để tô ca ngày/đêm, click lại để bỏ. Giữ chuột và kéo để tô nhanh.
      </p>
    </>
  );
}
