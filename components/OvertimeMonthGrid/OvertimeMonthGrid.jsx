import React from "react";
import dayjs from "dayjs";
import DayCell from "./DayCell";
import { CSS } from "./styles";

function parseRestDay(restDay) {
  if (!restDay) return null;
  const s = String(restDay).trim().toLowerCase();

  const map = {
    "chủ nhật": 7,
    cn: 7,
    "thứ 2": 1,
    t2: 1,
    "thứ 3": 2,
    t3: 2,
    "thứ 4": 3,
    t4: 3,
    "thứ 5": 4,
    t5: 4,
    "thứ 6": 5,
    t6: 5,
    "thứ 7": 6,
    t7: 6,
  };

  const n = Number(restDay);
  if (!isNaN(n) && n >= 1 && n <= 7) return n;

  return map[s] ?? null;
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getOvertimeForDay(overtimes, key, member) {
  if (!Array.isArray(overtimes)) return null;

  return overtimes.find((o) => {
    const oKey =
      (o.date && String(o.date).slice(0, 10)) ||
      (o.currentDate &&
        (typeof o.currentDate === "object" && o.currentDate.toDate
          ? o.currentDate.toDate().toISOString().slice(0, 10)
          : String(o.currentDate).slice(0, 10)));

    if (!oKey || oKey !== key) return false;

    if (o.memberId && member?.id) return String(o.memberId) === String(member.id);
    if (o.realName && member?.realName) return String(o.realName) === String(member.realName);

    return false;
  });
}

export default function OvertimeMonthGrid({
  members = [],
  shiftSchedules = {},
  overtimes = [],
  selectedMonth,
  selectedYear,
  onCellClick,
}) {
  const [viewMode, setViewMode] = React.useState("rest");

  const daysInMonth = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`).daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dayMembers = members.filter((m) => !String(m.shift || "").toLowerCase().includes("đêm"));
  const nightMembers = members.filter((m) => String(m.shift || "").toLowerCase().includes("đêm"));

  const getShiftRec = (dateKey, member) => {
    if (!shiftSchedules || !shiftSchedules[dateKey]) return null;

    const dateData = shiftSchedules[dateKey];

    if (member?.id && dateData[member.id]) return dateData[member.id];
    if (member?.realName && dateData[member.realName]) return dateData[member.realName];

    return Object.values(dateData).find(
      (v) =>
        String(v.memberId) === String(member.id) ||
        (v.realName && member.realName && String(v.realName) === String(member.realName))
    );
  };

  const weekdayLabels = days.map((d) => {
    const key = formatDateKey(selectedYear, selectedMonth, d);
    const weekday = dayjs(key).day();
    const label = weekday === 0 ? "CN" : `T${weekday + 1}`;
    return { day: d, weekday, label };
  });

  function getTotalOT(member) {
    let total = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(selectedYear, selectedMonth, d);
      const otRec = getOvertimeForDay(overtimes, key, member);
      const shiftRec = getShiftRec(key, member);

      const tang = Number(otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0);
      const thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);

      total += tang + thuong;
    }
    return total;
  }

  function sortMembers(list) {
    let result = [...list];

    if (viewMode === "rest") result.sort((a, b) => parseRestDay(a.restDay) - parseRestDay(b.restDay));
    if (viewMode === "otAsc") result.sort((a, b) => getTotalOT(a) - getTotalOT(b));
    if (viewMode === "otDesc") result.sort((a, b) => getTotalOT(b) - getTotalOT(a));

    return result;
  }

  const sortedDay = sortMembers(dayMembers);
  const sortedNight = sortMembers(nightMembers);

  return (
    <div className={CSS.container}>
      {/* Header */}
      <div className={CSS.headerBox}>
        <h3 className={CSS.headerTitle}>
          Lịch tăng ca - Tháng {String(selectedMonth).padStart(2, "0")}/{selectedYear}
        </h3>

        <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className={CSS.headerSelect}>
          <option value="normal">Mặc định</option>
          <option value="rest">Theo ngày nghỉ luân phiên</option>
          <option value="otAsc">Giờ tăng ca ít nhất</option>
          <option value="otDesc">Giờ tăng ca nhiều nhất</option>
        </select>
      </div>

      {/* TABLE */}
      <table className={CSS.table}>
        <thead>
          <tr>
            <th className={`${CSS.headerCell} ${CSS.stickyCA}`}>CA</th>
            <th className={`${CSS.headerCell} ${CSS.stickyName}`}>HỌ TÊN</th>
            <th className={`${CSS.headerCell} ${CSS.stickyNick}`}>Nickname</th>
            <th className={`${CSS.headerCell} ${CSS.stickyShift}`}>Giờ Lên Ca</th>

            {weekdayLabels.map(({ day, label }) => (
              <th key={day} className={`${CSS.headerCell} w-[48px]`}>
                <div>{label}</div>
                <div className="font-bold">{day}</div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* DAY SHIFT */}
          <tr className="h-8">
            <td className={`${CSS.stickyCA} font-semibold`} colSpan={4}>
              CA NGÀY
            </td>
          </tr>

          {sortedDay.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <td className={`${CSS.stickyCA}`}>Ngày</td>
              <td className={`${CSS.stickyName}`}>{m.realName}</td>
              <td className={`${CSS.stickyNick}`}>{m.nickname || "--"}</td>
              <td className={`${CSS.stickyShift}`}>{m.shiftStart || "--"}</td>

              {days.map((d) => {
                const key = formatDateKey(selectedYear, selectedMonth, d);
                const shiftRec = getShiftRec(key, m);
                const otRec = getOvertimeForDay(overtimes, key, m);

                const weekday = dayjs(key).day();
                const isCn = weekday === 0;
                const restNum = parseRestDay(m.restDay);
                const isRest = restNum === (weekday === 0 ? 7 : weekday);

                const tang = Number(otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0);
                const thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);

                return (
                  <td key={d}>
                    <DayCell
                      isRest={isRest}
                      isCn={isCn}
                      tang={tang}
                      thuong={thuong}
                      onClick={() => onCellClick?.(key, m, { shiftRec, otRec })}
                    />
                  </td>
                );
              })}
            </tr>
          ))}

          {/* NIGHT SHIFT */}
          <tr className="h-8">
            <td className={`${CSS.stickyCA} font-semibold`} colSpan={4}>
              CA ĐÊM
            </td>
          </tr>

          {sortedNight.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <td className={`${CSS.stickyCA}`}>Đêm</td>
              <td className={`${CSS.stickyName}`}>{m.realName}</td>
              <td className={`${CSS.stickyNick}`}>{m.nickname || "--"}</td>
              <td className={`${CSS.stickyShift}`}>{m.shiftStart || "--"}</td>

              {days.map((d) => {
                const key = formatDateKey(selectedYear, selectedMonth, d);
                const shiftRec = getShiftRec(key, m);
                const otRec = getOvertimeForDay(overtimes, key, m);

                const weekday = dayjs(key).day();
                const isCn = weekday === 0;
                const restNum = parseRestDay(m.restDay);
                const isRest = restNum === (weekday === 0 ? 7 : weekday);

                const tang = Number(otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0);
                const thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);

                return (
                  <td key={d}>
                    <DayCell
                      isRest={isRest}
                      isCn={isCn}
                      tang={tang}
                      thuong={thuong}
                      onClick={() => onCellClick?.(key, m, { shiftRec, otRec })}
                    />
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
