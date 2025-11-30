import React, { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import DayCell from "./DayCell";
import { CSS } from "./styles";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

/* ========================= HELPERS ========================= */

function parseRestDay(restDay) {
  if (!restDay) return null;
  const map = {
    "chủ nhật": 7, cn: 7,
    "thứ 2": 1, t2: 1,
    "thứ 3": 2, t3: 2,
    "thứ 4": 3, t4: 3,
    "thứ 5": 4, t5: 4,
    "thứ 6": 5, t6: 5,
    "thứ 7": 6, t7: 6,
  };
  const s = String(restDay).trim().toLowerCase();
  const n = Number(restDay);
  if (!isNaN(n) && n >= 1 && n <= 7) return n;
  return map[s] ?? null;
}

function formatDateKey(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getOvertimeForDay(overtimes, key, member) {
  return (
    overtimes.find((o) => {
      const oKey =
        (o.date && String(o.date).slice(0, 10)) ||
        (o.currentDate?.toDate
          ? o.currentDate.toDate().toISOString().slice(0, 10)
          : String(o.currentDate).slice(0, 10));

      if (oKey !== key) return false;

      return (
        (o.memberId && String(o.memberId) === String(member.id)) ||
        (o.realName && String(o.realName) === String(member.realName))
      );
    }) || null
  );
}

function getShiftDisplay(m, shiftCfg, shiftRec) {
  if (!shiftCfg?.day || !shiftCfg?.night) return "--";

  const shiftName = shiftRec?.shift || m.shift || "";
  const shiftStart = shiftRec?.shiftStart || m.shiftStart || "08:00";

  const isNight = shiftName.toLowerCase().includes("đêm");
  const cfg = isNight ? shiftCfg.night : shiftCfg.day;

  const isEarly = ["sớm", "som", "early"].some((x) =>
    shiftStart.toLowerCase().includes(x)
  );

  const end = isEarly
    ? shiftRec?.lenCaSomKetThuc || cfg?.lenCaSomKetThuc
    : shiftRec?.lenCaMuonKetThuc || cfg?.lenCaMuonKetThuc;

  return end || "--";
}

/* ========================= COMPONENT ========================= */

export default function OvertimeMonthGrid({
  members = [],
  shiftSchedules = {},
  overtimes = [],
  selectedMonth,
  selectedYear,
  onCellClick,
}) {
  const [viewMode, setViewMode] = useState("normal");
  const [shiftCfg, setShiftCfg] = useState({ day: null, night: null });

  // State ghim cột
  const [stickyCols, setStickyCols] = useState({
    stt: false,
    name: false,
    nick: false,
    shift: false,
  });

  // Width Option A
  const COL_WIDTHS = useMemo(
    () => ({ stt: 55, name: 160, nick: 140, shift: 100 }),
    []
  );

  const COL_ORDER = useMemo(() => ["stt", "name", "nick", "shift"], []);

  /* ----- Load shiftConfig ----- */
  useEffect(() => {
    const load = async () => {
      try {
        const [daySnap, nightSnap] = await Promise.all([
          getDoc(doc(db, "shiftConfig", "day")),
          getDoc(doc(db, "shiftConfig", "night")),
        ]);
        setShiftCfg({
          day: daySnap.exists() ? daySnap.data() : {},
          night: nightSnap.exists() ? nightSnap.data() : {},
        });
      } catch (err) {
        console.error("Lỗi shiftConfig:", err);
      }
    };
    load();
  }, []);

  /* ----- Days ----- */
  const daysInMonth = dayjs(
    `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
  ).daysInMonth();

  const days = [...Array(daysInMonth)].map((_, i) => i + 1);

  /* ----- Tách ca ----- */
  const dayMembers = members.filter(
    (m) => !String(m.shift).toLowerCase().includes("đêm")
  );
  const nightMembers = members.filter((m) =>
    String(m.shift).toLowerCase().includes("đêm")
  );

  /* ----- shiftRec ----- */
  const getShiftRec = (key, m) => {
    const data = shiftSchedules[key];
    if (!data) return null;

    return (
      data[m.id] ||
      data[m.realName] ||
      Object.values(data).find(
        (v) =>
          String(v.memberId) === String(m.id) ||
          String(v.realName) === String(m.realName)
      ) ||
      null
    );
  };

  /* ----- Weekday labels ----- */
  const weekdayLabels = days.map((d) => {
    const key = formatDateKey(selectedYear, selectedMonth, d);
    const w = dayjs(key).day();
    return { day: d, label: w === 0 ? "CN" : `T${w + 1}`, weekday: w };
  });

  /* ----- Total OT ----- */
  const getTotalOT = (m) =>
    days.reduce((sum, d) => {
      const key = formatDateKey(selectedYear, selectedMonth, d);
      const ot = getOvertimeForDay(overtimes, key, m);
      const sr = getShiftRec(key, m);
      return (
        sum +
        Number(ot?.tangCaHomNay ?? sr?.tangCaHomNay ?? 0) +
        Number(ot?.thuong ?? sr?.thuong ?? 0)
      );
    }, 0);

  /* ----- Sorting ----- */
  const getSorted = (list) => {
    const arr = [...list];
    if (viewMode === "rest")
      return arr.sort(
        (a, b) => parseRestDay(a.restDay) - parseRestDay(b.restDay)
      );
    if (viewMode === "otAsc") return arr.sort((a, b) => getTotalOT(a) - getTotalOT(b));
    if (viewMode === "otDesc") return arr.sort((a, b) => getTotalOT(b) - getTotalOT(a));
    return arr;
  };

  const sortedDay = getSorted(dayMembers);
  const sortedNight = getSorted(nightMembers);

  /* ========== STICKY HELPERS ========== */

  const activeStickyCols = useMemo(
    () => COL_ORDER.filter((k) => stickyCols[k]),
    [stickyCols, COL_ORDER]
  );

  const calcLeftFor = (key) => {
    const idx = activeStickyCols.indexOf(key);
    if (idx === -1) return null;

    let sum = 0;
    for (let i = 0; i < idx; i++) {
      sum += COL_WIDTHS[activeStickyCols[i]];
    }
    return sum;
  };

  const toggleSticky = (key) =>
    setStickyCols((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ========================= RENDER GROUP ========================= */

  const renderShiftGroup = (label, list, startIndex) => (
    <>
      <tr className="h-8">
        <td
          className="font-semibold text-[13px] bg-[#EEF2FF] dark:bg-[#1C1F2A] text-indigo-700 dark:text-indigo-300 border-y border-gray-300 dark:border-gray-700"
          colSpan={4 + days.length}
        >
          {label}
        </td>
      </tr>

      {list.map((m, idx) => {
        const stt = startIndex + idx + 1;

        return (
          <tr key={m.id} className="transition">
            {/* STT */}
            <td
              className={`${CSS.stickySTT} ${stickyCols.stt ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-transparent"
                }`}
              style={
                stickyCols.stt
                  ? { position: "sticky", left: calcLeftFor("stt"), zIndex: 30 }
                  : undefined
              }
            >
              {stt}
            </td>

            {/* Name */}
            <td
              className={`${CSS.stickyName} ${stickyCols.name ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-transparent"
                }`}
              style={
                stickyCols.name
                  ? { position: "sticky", left: calcLeftFor("name"), zIndex: 30 }
                  : undefined
              }
            >
              {m.realName}
            </td>

            {/* Nick */}
            <td
              className={`${CSS.stickyNick} ${stickyCols.nick ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-transparent"
                }`}
              style={
                stickyCols.nick
                  ? { position: "sticky", left: calcLeftFor("nick"), zIndex: 30 }
                  : undefined
              }
            >
              {m.nickname || "--"}
            </td>

            {/* Shift */}
            <td
              className={`${CSS.stickyShift} ${stickyCols.shift ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-transparent"
                }`}
              style={
                stickyCols.shift
                  ? { position: "sticky", left: calcLeftFor("shift"), zIndex: 30 }
                  : undefined
              }
            >
              {getShiftDisplay(
                m,
                shiftCfg,
                getShiftRec(formatDateKey(selectedYear, selectedMonth, dayjs().date()), m)
              )}
            </td>

            {/* Days */}
            {days.map((d) => {
              const key = formatDateKey(selectedYear, selectedMonth, d);
              const shiftRec = getShiftRec(key, m);
              const otRec = getOvertimeForDay(overtimes, key, m);

              const w = dayjs(key).day();
              const isRest = parseRestDay(m.restDay) === (w === 0 ? 7 : w);

              const tang = Number(otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0);
              const thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);

              return (
                <td
                  key={d}
                  className={`p-0 ${w === 0 ? "bg-orange-50 dark:bg-orange-900/20" : "bg-transparent"
                    }`}
                >
                  <DayCell
                    isRest={isRest}
                    isCn={w === 0}
                    tang={tang}
                    thuong={thuong}
                    onClick={() => onCellClick?.(key, m, { shiftRec, otRec })}
                  />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );

  /* ========================= UI ========================= */

  return (
    <div className={CSS.container}>
      <div className={CSS.headerBox}>
        <h3 className={CSS.headerTitle}>
          Lịch tăng ca - Tháng {String(selectedMonth).padStart(2, "0")}/{selectedYear}
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

      <div className={CSS.scrollArea}>
        <table className={CSS.table}>
          <thead>
            <tr>
              {/* STT header */}
              <th
                className={`${CSS.headerCell} ${CSS.stickySTT} ${stickyCols.stt ? "bg-yellow-50 dark:bg-yellow-900/30" : ""
                  }`}
                style={
                  stickyCols.stt
                    ? { position: "sticky", left: calcLeftFor("stt"), zIndex: 40 }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>STT</span>
                  <button
                    onClick={() => toggleSticky("stt")}
                    className={`text-xs p-1 ${stickyCols.stt ? "text-yellow-500" : "text-gray-400 dark:text-gray-300"
                      }`}
                  >
                    📌
                  </button>
                </div>
              </th>

              {/* Name */}
              <th
                className={`${CSS.headerCell} ${CSS.stickyName} ${stickyCols.name ? "bg-yellow-50 dark:bg-yellow-900/30" : ""
                  }`}
                style={
                  stickyCols.name
                    ? { position: "sticky", left: calcLeftFor("name"), zIndex: 40 }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>HỌ TÊN</span>
                  <button
                    onClick={() => toggleSticky("name")}
                    className={`text-xs p-1 ${stickyCols.name ? "text-yellow-500" : "text-gray-400 dark:text-gray-300"
                      }`}
                  >
                    📌
                  </button>
                </div>
              </th>

              {/* Nick */}
              <th
                className={`${CSS.headerCell} ${CSS.stickyNick} ${stickyCols.nick ? "bg-yellow-50 dark:bg-yellow-900/30" : ""
                  }`}
                style={
                  stickyCols.nick
                    ? { position: "sticky", left: calcLeftFor("nick"), zIndex: 40 }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>Nickname</span>
                  <button
                    onClick={() => toggleSticky("nick")}
                    className={`text-xs p-1 ${stickyCols.nick ? "text-yellow-500" : "text-gray-400 dark:text-gray-300"
                      }`}
                  >
                    📌
                  </button>
                </div>
              </th>

              {/* Shift */}
              <th
                className={`${CSS.headerCell} ${CSS.stickyShift} ${stickyCols.shift ? "bg-yellow-50 dark:bg-yellow-900/30" : ""
                  }`}
                style={
                  stickyCols.shift
                    ? { position: "sticky", left: calcLeftFor("shift"), zIndex: 40 }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>Giờ Lên Ca</span>
                  <button
                    onClick={() => toggleSticky("shift")}
                    className={`text-xs p-1 ${stickyCols.shift ? "text-yellow-500" : "text-gray-400 dark:text-gray-300"
                      }`}
                  >
                    📌
                  </button>
                </div>
              </th>

              {/* Day headers */}
              {weekdayLabels.map(({ day, label, weekday }) => (
                <th
                  key={day}
                  className={`${CSS.headerCell} ${weekday === 0 ? "bg-orange-100 dark:bg-orange-900/100" : ""
                    }`}
                  style={{ width: "36px" }}
                >

                  <div>{label}</div>
                  <div className="font-bold">{day}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {renderShiftGroup("CA NGÀY", sortedDay, 0)}
            {renderShiftGroup("CA ĐÊM", sortedNight, sortedDay.length)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
