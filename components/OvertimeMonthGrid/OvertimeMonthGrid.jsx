import React, { useEffect, useState } from "react";
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

function getShiftDisplayReal(m, shiftCfg, shiftRec) {
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

/* ========================= COMPONENT ========================= */

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

  /* ----- shift rec ----- */
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

  /* ----- Sort members ----- */
  const sortMembers = (list) => {
    const arr = [...list];
    if (viewMode === "rest")
      return arr.sort(
        (a, b) => parseRestDay(a.restDay) - parseRestDay(b.restDay)
      );
    if (viewMode === "otAsc") return arr.sort((a, b) => getTotalOT(a) - getTotalOT(b));
    if (viewMode === "otDesc") return arr.sort((a, b) => getTotalOT(b) - getTotalOT(a));
    return arr;
  };

  const sortedDay = sortMembers(dayMembers);
  const sortedNight = sortMembers(nightMembers);

  /* ========================= RENDER BLOCK ========================= */
  const renderShiftGroup = (label, list) => (
    <>
      <tr className="h-9">
        <td className={`${CSS.stickyCA} font-semibold text-[13px]`} colSpan={4}>
          {label}
        </td>
      </tr>

      {list.map((m, i) => (
  <tr
    key={m.id}
    className="hover:bg-gray-100/60 dark:hover:bg-gray-800/40 transition"
  >
    {i === 0 && (
      <td
        className={CSS.stickyCA}
        rowSpan={list.length}       // GỘP NHÓM TẠI ĐÂY
      >
        {label}  {/* "CA NGÀY" hoặc "CA ĐÊM" */}
      </td>
    )}

    <td className={CSS.stickyName}>{m.realName}</td>
    <td className={CSS.stickyNick}>{m.nickname || "--"}</td>
    <td className={CSS.stickyShift}>
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

      const w = dayjs(key).day();
      const isRest = parseRestDay(m.restDay) === (w === 0 ? 7 : w);

      const tang = Number(otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0);
      const thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);

      return (
        <td key={d}>
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
))}

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
            {renderShiftGroup("CA NGÀY", sortedDay)}
            {renderShiftGroup("CA ĐÊM", sortedNight)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
