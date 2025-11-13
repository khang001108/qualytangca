// components/ManageMembers/ShiftAssign/ShiftAssignShiftSelector.jsx

export default function ShiftAssignShiftSelector({
  shiftType,
  setShiftType,
  loading,
}) {
  return (
    <div
      className={`flex justify-center gap-3 mb-4 transition ${
        loading ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <button
        onClick={() => setShiftType("day")}
        className={`px-4 py-2 rounded-lg border ${
          shiftType === "day"
            ? "bg-yellow-400 text-white shadow border-yellow-500"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
        }`}
      >
        ☀️ Ca ngày
      </button>

      <button
        onClick={() => setShiftType("night")}
        className={`px-4 py-2 rounded-lg border ${
          shiftType === "night"
            ? "bg-indigo-500 text-white shadow border-indigo-600"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
        }`}
      >
        🌙 Ca đêm
      </button>
    </div>
  );
}
