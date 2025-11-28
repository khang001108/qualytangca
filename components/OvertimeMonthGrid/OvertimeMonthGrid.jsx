import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import DayCell from "./DayCell";
import { CSS } from "./styles";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

// ===================================================================================
// PARSE REST DAY
// ===================================================================================
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

// ===================================================================================
// HIỂN THỊ GIỜ TAN CA — MATCH 100% TableRow
// ===================================================================================
function getShiftDisplayReal(m, shiftCfg, shiftRec) {
  if (!shiftCfg?.day || !shiftCfg?.night) return "--";

  // 1) shiftName + shiftStart chính xác
  let shiftName = m.shift;
  let shiftStart = m.shiftStart;

  if (shiftRec) {
    shiftName = shiftRec.shift || shiftName;
    shiftStart = shiftRec.shiftStart || shiftStart;
  }

  shiftStart = shiftStart || "08:00";

  // 2) xác định ca đêm
  const isNightShift =
    (shiftName || "").toLowerCase().includes("đêm") ||
    shiftStart.includes("đêm") ||
    shiftStart.includes("night");

  const cfg = isNightShift ? shiftCfg.night : shiftCfg.day;

  // 3) xác định ca sớm / muộn
  const isEarly =
    shiftStart.includes("sớm") ||
    shiftStart.includes("som") ||
    shiftStart.includes("early");

  // 4) ưu tiên shiftSchedules
  if (shiftRec) {
    const endTime = isEarly
      ? shiftRec.lenCaSomKetThuc
      : shiftRec.lenCaMuonKetThuc;

    if (endTime) return endTime;
  }

  // 5) fallback config
  const endTime = isEarly
    ? cfg?.lenCaSomKetThuc
    : cfg?.lenCaMuonKetThuc;

  return endTime || "--";
}

// ===================================================================================
// FORMAT DATE KEY
// ===================================================================================
function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

// ===================================================================================
// GET OT RECORD
// ===================================================================================
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

    if (o.memberId && member?.id)
      return String(o.memberId) === String(member.id);
    if (o.realName && member?.realName)
      return String(o.realName) === String(member.realName);

    return false;
  });
}

// ===================================================================================
// MAIN COMPONENT
// ===================================================================================
export default function OvertimeMonthGrid({
  members = [],
  shiftSchedules = {},
  overtimes = [],
  selectedMonth,
  selectedYear,
  onCellClick,
}) {
  const [viewMode, setViewMode] = useState("rest");
  const [shiftCfg, setShiftCfg] = useState({ day: null, night: null });

  // ===================================================================================
  // LOAD shiftConfig/day và shiftConfig/night
  // ===================================================================================
  useEffect(() => {
    const fetchShift = async () => {
      try {
        const daySnap = await getDoc(doc(db, "shiftConfig", "day"));
        const nightSnap = await getDoc(doc(db, "shiftConfig", "night"));

        setShiftCfg({
          day: daySnap.exists() ? daySnap.data() : {},
          night: nightSnap.exists() ? nightSnap.data() : {},
        });

        console.log("Loaded shiftConfig:", {
          day: daySnap.data(),
          night: nightSnap.data(),
        });
      } catch (err) {
        console.error("Lỗi tải shiftConfig:", err);
      }
    };

    fetchShift();
  }, []);

  // =============================================
  // MONTH DAYS
  // =============================================
  const daysInMonth = dayjs(
    `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
  ).daysInMonth();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dayMembers = members.filter(
    (m) => !String(m.shift || "").toLowerCase().includes("đêm")
  );
  const nightMembers = members.filter((m) =>
    String(m.shift || "").toLowerCase().includes("đêm")
  );

  // =============================================
  // SHIFT REC (từ shiftSchedules)
  // =============================================
  const getShiftRec = (dateKey, member) => {
    if (!shiftSchedules || !shiftSchedules[dateKey]) return null;

    const dateData = shiftSchedules[dateKey];

    if (member?.id && dateData[member.id]) return dateData[member.id];
    if (member?.realName && dateData[member.realName])
      return dateData[member.realName];

    return Object.values(dateData).find(
      (v) =>
        String(v.memberId) === String(member.id) ||
        (v.realName &&
          member.realName &&
          String(v.realName) === String(member.realName))
    );
  };

  // =============================================
  // WEEKDAY LABELS
  // =============================================
  const weekdayLabels = days.map((d) => {
    const key = formatDateKey(selectedYear, selectedMonth, d);
    const weekday = dayjs(key).day();
    const label = weekday === 0 ? "CN" : `T${weekday + 1}`;
    return { day: d, weekday, label };
  });

  // =============================================
  // TOTAL OT
  // =============================================
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

    if (viewMode === "rest")
      result.sort((a, b) => parseRestDay(a.restDay) - parseRestDay(b.restDay));

    if (viewMode === "otAsc")
      result.sort((a, b) => getTotalOT(a) - getTotalOT(b));

    if (viewMode === "otDesc")
      result.sort((a, b) => getTotalOT(b) - getTotalOT(a));

    return result;
  }

  const sortedDay = sortMembers(dayMembers);
  const sortedNight = sortMembers(nightMembers);

  // ===================================================================================
  // RENDER
  // ===================================================================================
  return (
    <div className={CSS.container}>
      {/* HEADER */}
      <div className={CSS.headerBox}>
        <h3 className={CSS.headerTitle}>
          Lịch tăng ca - Tháng {String(selectedMonth).padStart(2, "0")}/
          {selectedYear}
        </h3>

        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          className={CSS.headerSelect}
        >
          <option value="normal">Mặc định</option>
          <option value="rest">Theo ngày nghỉ</option>
          <option value="otAsc">Giờ tăng ca ít nhất</option>
          <option value="otDesc">Giờ tăng ca nhiều nhất</option>
        </select>
      </div>

      {/* TABLE */}
      <div className={CSS.scrollArea}>
        <table className={CSS.table}>
          <thead>
            <tr>
              <th className={`${CSS.headerCell} ${CSS.stickyCA}`}>CA</th>
              <th className={`${CSS.headerCell} ${CSS.stickyName}`}>HỌ TÊN</th>
              <th className={`${CSS.headerCell} ${CSS.stickyNick}`}>
                Nickname
              </th>
              <th className={`${CSS.headerCell} ${CSS.stickyShift}`}>
                Giờ Lên Ca
              </th>

              {weekdayLabels.map(({ day, label }) => (
                <th key={day} className={`${CSS.headerCell} w-[48px]`}>
                  <div>{label}</div>
                  <div className="font-bold">{day}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* =============== CA NGÀY =============== */}
            <tr className="h-9">
              <td
                className={`${CSS.stickyCA} font-semibold text-[13px]`}
                colSpan={4}
              >
                CA NGÀY
              </td>
            </tr>

            {sortedDay.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-gray-100/60 dark:hover:bg-gray-800/40 transition"
              >
                <td className={`${CSS.stickyCA}`}>Ngày</td>
                <td className={`${CSS.stickyName}`}>{m.realName}</td>
                <td className={`${CSS.stickyNick}`}>{m.nickname || "--"}</td>

                <td className={`${CSS.stickyShift}`}>
                  {getShiftDisplayReal(
                    m,
                    shiftCfg,
                    getShiftRec(
                      formatDateKey(selectedYear, selectedMonth, dayjs().date()),
                      m
                    )
                  )}
                </td>

                {days.map((d) => {
                  const key = formatDateKey(selectedYear, selectedMonth, d);
                  const shiftRec = getShiftRec(key, m);
                  const otRec = getOvertimeForDay(overtimes, key, m);

                  const weekday = dayjs(key).day();
                  const isCn = weekday === 0;
                  const restNum = parseRestDay(m.restDay);
                  const isRest = restNum === (weekday === 0 ? 7 : weekday);

                  const tang = Number(
                    otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0
                  );
                  const thuong = Number(
                    otRec?.thuong ?? shiftRec?.thuong ?? 0
                  );

                  return (
                    <td key={d}>
                      <DayCell
                        isRest={isRest}
                        isCn={isCn}
                        tang={tang}
                        thuong={thuong}
                        onClick={() =>
                          onCellClick?.(key, m, { shiftRec, otRec })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* =============== CA ĐÊM =============== */}
            <tr className="h-9">
              <td
                className={`${CSS.stickyCA} font-semibold text-[13px]`}
                colSpan={4}
              >
                CA ĐÊM
              </td>
            </tr>

            {sortedNight.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-gray-100/60 dark:hover:bg-gray-800/40 transition"
              >
                <td className={`${CSS.stickyCA}`}>Đêm</td>
                <td className={`${CSS.stickyName}`}>{m.realName}</td>
                <td className={`${CSS.stickyNick}`}>{m.nickname || "--"}</td>

                <td className={`${CSS.stickyShift}`}>
                  {getShiftDisplayReal(
                    m,
                    shiftCfg,
                    getShiftRec(
                      formatDateKey(selectedYear, selectedMonth, dayjs().date()),
                      m
                    )
                  )}
                </td>

                {days.map((d) => {
                  const key = formatDateKey(selectedYear, selectedMonth, d);
                  const shiftRec = getShiftRec(key, m);
                  const otRec = getOvertimeForDay(overtimes, key, m);

                  const weekday = dayjs(key).day();
                  const isCn = weekday === 0;
                  const restNum = parseRestDay(m.restDay);
                  const isRest = restNum === (weekday === 0 ? 7 : weekday);

                  const tang = Number(
                    otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0
                  );
                  const thuong = Number(
                    otRec?.thuong ?? shiftRec?.thuong ?? 0
                  );

                  return (
                    <td key={d}>
                      <DayCell
                        isRest={isRest}
                        isCn={isCn}
                        tang={tang}
                        thuong={thuong}
                        onClick={() =>
                          onCellClick?.(key, m, { shiftRec, otRec })
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
