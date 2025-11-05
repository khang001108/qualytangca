// components/PopupCalendar.js
export default function PopupCalendar({
  member,
  selectedMonth,
  selectedYear,
  overtimeItems = [],
  onClose,
}) {
  // 🔹 Tính đúng số ngày trong tháng hiện tại
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-2xl p-6 w-80 sm:w-96 shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-3 text-center">
          📅 Lịch tăng ca - {member?.nickname || member?.realName}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">
          Tháng {selectedMonth}/{selectedYear}
        </p>

        {/* 🔹 Lưới ngày trong tháng */}
        <div className="grid grid-cols-7 gap-1 text-xs text-center">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const otRecord = overtimeItems.find(
              (o) => new Date(o.currentDate).getDate() === d
            );

            // 🔸 Xác định màu nền theo trạng thái tăng ca
            let bg =
              "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"; // mặc định chưa có dữ liệu

            if (otRecord) {
              if (otRecord.checkIn && !otRecord.checkOut) {
                bg =
                  "bg-blue-200 dark:bg-blue-700/50 text-blue-900 dark:text-blue-200 font-semibold"; // chỉ lên ca
              } else if (otRecord.checkOut) {
                bg =
                  "bg-green-200 dark:bg-green-700/50 text-green-900 dark:text-green-200 font-semibold"; // đã xuống ca
              }
            }

            return (
              <div
                key={d}
                title={
                  otRecord
                    ? `Lên: ${otRecord.checkIn || "?"} / Xuống: ${
                        otRecord.checkOut || "?"
                      }`
                    : "Không có dữ liệu"
                }
                className={`p-2 rounded-lg border border-gray-200 dark:border-gray-700 ${bg} hover:scale-105 transition`}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* 🔹 Ghi chú màu */}
        <div className="mt-4 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-200 dark:bg-green-700/50 border border-green-400 dark:border-green-600 rounded" />
              Đã xuống ca
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-200 dark:bg-blue-700/50 border border-blue-400 dark:border-blue-600 rounded" />
              Chỉ lên ca
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded" />
              Chưa có
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white py-2 rounded-xl transition"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
