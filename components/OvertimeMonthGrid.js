// components/OvertimeMonthGrid.js
import React from "react";
import dayjs from "dayjs";

/**
 * Props:
 * - members: array of member objects (id, realName, nickname, shift, shiftStart, restDay, ...)
 * - shiftSchedules: map { "YYYY-MM-DD": { memberId/realName: { ... } } }
 * - overtimes: array of OT records
 * - selectedMonth: 1..12
 * - selectedYear: number
 */

// ------------------ REST DAY PARSER ------------------
function parseRestDay(restDay) {
  if (!restDay) return null;

  const s = String(restDay).trim().toLowerCase();

  const map = {
    "chủ nhật": 7,
    "cn": 7,

    "thứ 2": 1,
    "t2": 1,

    "thứ 3": 2,
    "t3": 2,

    "thứ 4": 3,
    "t4": 3,

    "thứ 5": 4,
    "t5": 4,

    "thứ 6": 5,
    "t6": 5,

    "thứ 7": 6,
    "t7": 6,
  };

  // Người dùng nhập số vẫn hỗ trợ: 1..7
  const n = Number(restDay);
  if (!isNaN(n) && n >= 1 && n <= 7) return n;

  return map[s] ?? null;
}

// ------------------ FORMAT DATE ------------------
function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ------------------ FIND OT RECORD ------------------
function getOvertimeForDay(overtimes, key, member) {
  if (!Array.isArray(overtimes)) return null;

  return overtimes.find((o) => {
    const oKey =
      (o.date && String(o.date).slice(0, 10)) ||
      (o.currentDate &&
        (typeof o.currentDate === "object" && o.currentDate.toDate
          ? o.currentDate.toDate().toISOString().slice(0, 10)
          : String(o.currentDate).slice(0, 10))) ||
      null;

    if (!oKey) return false;
    if (oKey !== key) return false;

    if (o.memberId && member?.id) {
      return String(o.memberId) === String(member.id);
    }

    if (o.realName && member?.realName) {
      return String(o.realName) === String(member.realName);
    }

    return false;
  });
}

// ------------------ MAIN COMPONENT ------------------
export default function OvertimeMonthGrid({
  members = [],
  shiftSchedules = {},
  overtimes = [],
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear(),
  onCellClick = null,
}) {
  const daysInMonth = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`).daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dayMembers = members.filter((m) => !(String(m.shift || "").toLowerCase().includes("đêm")));
  const nightMembers = members.filter((m) => String(m.shift || "").toLowerCase().includes("đêm"));

  // Read shift schedule
  const getShiftRec = (dateKey, member) => {
    if (!shiftSchedules || !shiftSchedules[dateKey]) return null;

    const dateData = shiftSchedules[dateKey];

    if (member?.id && dateData[member.id]) return dateData[member.id];
    if (member?.realName && dateData[member.realName]) return dateData[member.realName];

    const found = Object.values(dateData).find(
      (v) =>
        String(v.memberId) === String(member?.id) ||
        (v.realName && member?.realName && String(v.realName) === String(member.realName))
    );

    return found || null;
  };

  // Weekday headers
  const weekdayLabels = days.map((d) => {
    const key = formatDateKey(selectedYear, selectedMonth, d);
    const weekday = dayjs(key).day(); // 0 = CN .. 6 = Thứ 7

    const label = weekday === 0 ? "CN" : `T${weekday + 1}`;
    return { day: d, weekday, label };
  });

  // ------------------ STYLES ------------------
  const leftColClass =
    "sticky left-0 z-20 bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700";

  const cellBaseClass =
    "w-10 h-10 flex items-center justify-center text-xs rounded-md select-none border border-gray-300 dark:border-gray-700";

  const sundayHeaderBg =
    "bg-orange-300 text-white dark:bg-orange-400";

  const leaveBg =
    "bg-blue-500 text-white dark:bg-blue-600";  // 休 (light sáng hơn)

  const otBg =
    "bg-emerald-500 text-white dark:bg-emerald-600"; // OT mạnh hơn

  const workBg =
    "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-700";

  const cnStripe =
    "bg-orange-200 dark:bg-orange-700";

  // --- Sticky columns ---
  const colCA = "sticky left-0 z-30 bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700";
  const colName = "sticky left-[80px] z-30 bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700";
  const colID = "sticky left-[240px] z-30 bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700";
  const colShift = "sticky left-[360px] z-30 bg-white dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700";

  // ------------------ RENDER ------------------
  return (
    <div className="overflow-auto border rounded-2xl shadow-xl 
     bg-white dark:bg-gray-900 
     text-gray-900 dark:text-gray-200
     shadow-gray-300 dark:shadow-black/40
     p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Lịch tăng ca - Tháng {String(selectedMonth).padStart(2, "0")}/{selectedYear}
        </h3>
      </div>

      <table className="min-w-max border-separate [border-spacing:4px]">
        <thead>
          <tr>
            <th className={`${colCA} w-20 px-4 py-2 text-sm`}>CA</th>
            <th className={`${colName} w-40 px-6 py-2 text-sm`}>HỌ TÊN</th>
            <th className={`${colID} w-32 px-4 py-2 text-sm`}>ID</th>
            <th className={`${colShift} w-28 px-4 py-2 text-sm`}>Giờ Lên Ca</th>

            {weekdayLabels.map(({ day, weekday, label }) => (
              <th
                key={`h-${day}`}
                className={`
  text-xs font-semibold 
  text-gray-800 dark:text-gray-200 
  bg-gray-100 dark:bg-transparent
  px-2 py-1 text-center 
  ${weekday === 0 ? sundayHeaderBg : ""}
`}

              >
                <div>{label}</div>
                <div className="text-sm font-bold">{day}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ================= CA NGÀY ================= */}
          <tr>
            <td className={`${leftColClass} px-4 py-2 font-semibold text-sm`} colSpan={4}>
              CA NGÀY
            </td>
            {days.map((d) => (
              <td key={`gap-day-${d}`} />
            ))}
          </tr>

          {/** ---- Day members ---- */}
          {dayMembers.map((m) => (
            <tr key={`day-${m.id}`}>
              <td className={`${colCA} w-20 px-4 py-2 text-sm`}>Ngày</td>
              <td className={`${colName} w-40 px-6 py-2 text-sm font-medium`}>{m.realName}</td>
              <td className={`${colID} w-32 px-4 py-2 text-sm`}>{m.id}</td>
              <td className={`${colShift} w-28 px-4 py-2 text-sm`}>{m.shiftStart || "--"}</td>

              {days.map((d) => {
                const key = formatDateKey(selectedYear, selectedMonth, d);
                const shiftRec = getShiftRec(key, m);
                const otRec = getOvertimeForDay(overtimes, key, m);
                const note = shiftRec?.note || "";

                const weekday = dayjs(key).day(); // 0..6
                const isCn = weekday === 0;

                // → convert về hệ 1..7
                const dayNum = weekday === 0 ? 7 : weekday;

                const restNum = parseRestDay(m.restDay);
                const isRest = restNum === dayNum;

                // NGHỈ (休)
                if (isRest) {
                  let classes = `${cellBaseClass} ${leaveBg}`;
                  if (isCn) classes += ` ${cnStripe}`;

                  return (
                    <td key={`d-${m.id}-${d}`}>
                      <div className={`${classes} m-1 cursor-default`}>
                        <div className="text-[11px]">休</div>
                      </div>
                    </td>
                  );
                }

                // NORMAL
                const tang = Number(otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0);
                const thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);

                let classes = `${cellBaseClass} ${workBg}`;
                let content = "";
                let title = `${m.realName} — ${key}`;

                if (otRec && (tang > 0 || thuong > 0)) {
                  classes = `${cellBaseClass} ${otBg}`;
                  content = `+${tang}${thuong ? ` +${thuong}` : ""}`;
                }

                if (isCn) classes += ` ${cnStripe}`;

                return (
                  <td key={`d-${m.id}-${d}`}>
                    <div
                      className={`${classes} m-1 cursor-pointer`}
                      onClick={() => onCellClick?.(key, m, { shiftRec, otRec })}
                      title={title}
                    >
                      <div className="text-[11px]">{content}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}

          {/* ================= CA ĐÊM ================= */}
          <tr>
            <td className={`${leftColClass} px-4 py-2 font-semibold text-sm`} colSpan={4}>
              CA ĐÊM
            </td>
            {days.map((d) => (
              <td key={`gap-night-${d}`} />
            ))}
          </tr>

          {/** ---- Night members ---- */}
          {nightMembers.map((m) => (
            <tr key={`night-${m.id}`}>
              <td className={`${colCA} w-20 px-4 py-2 text-sm`}>Đêm</td>
              <td className={`${colName} w-40 px-6 py-2 text-sm font-medium`}>{m.realName}</td>
              <td className={`${colID} w-32 px-4 py-2 text-sm`}>{m.id}</td>
              <td className={`${colShift} w-28 px-4 py-2 text-sm`}>{m.shiftStart || "--"}</td>

              {days.map((d) => {
                const key = formatDateKey(selectedYear, selectedMonth, d);
                const shiftRec = getShiftRec(key, m);
                const otRec = getOvertimeForDay(overtimes, key, m);

                const weekday = dayjs(key).day();
                const isCn = weekday === 0;

                const dayNum = weekday === 0 ? 7 : weekday;
                const restNum = parseRestDay(m.restDay);
                const isRest = restNum === dayNum;

                if (isRest) {
                  let classes = `${cellBaseClass} ${leaveBg}`;
                  if (isCn) classes += ` ${cnStripe}`;

                  return (
                    <td key={`rest-${m.id}-${d}`}>
                      <div className={`${classes} m-1 cursor-default`}>
                        <div className="text-[11px]">休</div>
                      </div>
                    </td>
                  );
                }

                const tang = Number(otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0);
                const thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);

                let classes = `${cellBaseClass} ${workBg}`;
                let content = "";

                if (otRec && (tang > 0 || thuong > 0)) {
                  classes = `${cellBaseClass} ${otBg}`;
                  content = `+${tang}${thuong ? ` +${thuong}` : ""}`;
                }

                if (isCn) classes += ` ${cnStripe}`;

                return (
                  <td key={`n-${m.id}-${d}`}>
                    <div
                      className={`${classes} m-1 cursor-pointer`}
                      onClick={() => onCellClick?.(key, m, { shiftRec, otRec })}
                    >
                      <div className="text-[11px]">{content}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
