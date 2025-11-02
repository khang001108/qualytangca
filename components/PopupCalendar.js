export default function PopupCalendar({
  member,
  selectedMonth,
  selectedYear,
  overtimeItems,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-80 sm:w-96 shadow-2xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-indigo-600 mb-3 text-center">
          📅 Lịch tăng ca - {member?.nickname || member?.realName}
        </h2>
        <p className="text-sm text-gray-500 mb-3 text-center">
          Tháng {selectedMonth}/{selectedYear}
        </p>

        <div className="grid grid-cols-7 gap-1 text-xs text-center">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
            const hasOT = overtimeItems.some(
              (o) => new Date(o.currentDate).getDate() === d
            );
            return (
              <div
                key={d}
                className={`p-2 rounded-lg ${
                  hasOT
                    ? "bg-green-200 text-green-800 font-semibold"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {d}
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-xl"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
