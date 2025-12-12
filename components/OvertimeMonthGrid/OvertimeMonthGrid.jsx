import React, { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import DayCell from "./DayCell";
import { CSS } from "./styles";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

/* ========================= HELPERS ========================= */

function parseRestDay(restDay) {
  if (!restDay) return null;
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

function getLastRealOTDay(m, days, selectedYear, selectedMonth, overtimes) {
  let last = 0;

  for (let d of days) {
    const key = formatDateKey(selectedYear, selectedMonth, d);
    const ot = getOvertimeForDay(overtimes, key, m);

    if (ot && (Number(ot.tangCaHomNay) > 0 || Number(ot.thuong) > 0)) {
      last = d;
    }
  }

  return last; // 0 nghĩa là chưa có ngày chấm công
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

/* ========================= PLAN MODE HELPERS ========================= */

function getRequiredDays(m) {
  const limit = m.overtimeLimit?.monthlyLimit || 0;
  const worked = m.overtimeLimit?.workedHours || 0;
  const perDay = Number(m.overtimeLimit?.perDay || 0);
  if (perDay <= 0) return 0;

  const remaining = Math.max(0, limit - worked);
  return Math.ceil(remaining / perDay);
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
  const [manualBlockDays, setManualBlockDays] = useState({});
  const today = dayjs().date();

  // MODE CHIA NGÀY CẦN TĂNG CA
  const [planMode, setPlanMode] = useState(false);

  // Sticky columns
  const [stickyCols, setStickyCols] = useState({
    stt: false,
    name: false,
    nick: false,
    shift: false,
  });

  const COL_WIDTHS = useMemo(
    () => ({ stt: 55, name: 160, nick: 140, shift: 100 }),
    []
  );

  const COL_ORDER = useMemo(() => ["stt", "name", "nick", "shift"], []);

  /* ----- LOAD manualBlockDays TỪ FIREBASE ----- */
  useEffect(() => {
    async function loadBlocks() {
      const ref = doc(
        db,
        "manualBlocks",
        String(selectedYear + "-" + selectedMonth)
      );
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setManualBlockDays(snap.data());
      }
    }
    loadBlocks();
  }, [selectedMonth, selectedYear]);

  async function saveBlocks(updated) {
    const ref = doc(
      db,
      "manualBlocks",
      String(selectedYear + "-" + selectedMonth)
    );
    await setDoc(ref, updated, { merge: true });
  }

  /* ========================= CLICK BLOCK DAY ========================= */
  const handleClickPlanMode = (day, m) => {
    const key = `${m.id}_${selectedYear}-${selectedMonth}`;

    const newSet = new Set(manualBlockDays[key] || []);

    if (newSet.has(day)) {
      newSet.delete(day); // click lần 2 → bỏ block
    } else {
      newSet.add(day); // click lần 1 → block
    }

    const updated = {
      ...manualBlockDays,
      [key]: Array.from(newSet),
    };

    setManualBlockDays(updated);
    saveBlocks(updated);
  };


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

  /* ----- Days in month ----- */
  const daysInMonth = dayjs(
    `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
  ).daysInMonth();

  const days = [...Array(daysInMonth)].map((_, i) => i + 1);

  /* ----- Tách ca ----- */
  const getShiftOfMonth = (m) => {
    const firstDayKey = formatDateKey(selectedYear, selectedMonth, 1);
    const rec = shiftSchedules[firstDayKey]?.[m.realName];
    return rec?.shift || m.shift || "";
  };

  const dayMembers = members.filter(
    (m) => !String(getShiftOfMonth(m)).toLowerCase().includes("đêm")
  );

  const nightMembers = members.filter((m) =>
    String(getShiftOfMonth(m)).toLowerCase().includes("đêm")
  );

  /* ----- shiftRec per day ----- */
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
    if (viewMode === "otAsc")
      return arr.sort((a, b) => getTotalOT(a) - getTotalOT(b));
    if (viewMode === "otDesc")
      return arr.sort((a, b) => getTotalOT(b) - getTotalOT(a));
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

        /* =========================
           PLAN MODE: TÍNH NGÀY CẦN TĂNG CA
        ============================ */
        let originalRequired = planMode ? getRequiredDays(m) : 0;
        let requiredDays = originalRequired;
        let perDayPlan = Number(m.overtimeLimit?.perDay || 0);
        let daysToAssign = new Set();

        if (planMode) {
          const lastRealOT = getLastRealOTDay(
            m,
            days,
            selectedYear,
            selectedMonth,
            overtimes
          );

          const today = dayjs().date();
          const blockKey = `${m.id}_${selectedYear}-${selectedMonth}`;

          const validDays = days.filter((day) => {
            const key = formatDateKey(selectedYear, selectedMonth, day);
            const w = dayjs(key).day();
            const weekday = w === 0 ? 7 : w;

            if (day < today) return false;
            if (day <= lastRealOT) return false;
            if (parseRestDay(m.restDay) === weekday) return false;

            const ot = getOvertimeForDay(overtimes, key, m);
            if (ot && (Number(ot.tangCaHomNay) > 0 || Number(ot.thuong) > 0)) {
              return false;
            }

            if (manualBlockDays[blockKey]?.includes(day)) return false;

            return true;
          });

          // 🔥 GIẢM SỐ NGÀY CẦN TĂNG CA SAU KHI BLOCK
          requiredDays = Math.min(originalRequired, validDays.length);

          validDays.slice(0, requiredDays).forEach((d) => {
            daysToAssign.add(d);
          });
        }



        return (
          <tr key={m.id} className="transition">
            {/* STT */}
            <td
              className={`${CSS.stickySTT} ${stickyCols.stt
                ? "bg-yellow-50 dark:bg-yellow-900/100"
                : "bg-transparent"
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
              className={`${CSS.stickyName} ${stickyCols.name
                ? "bg-yellow-50 dark:bg-yellow-900/100"
                : "bg-transparent"
                }`}
              style={
                stickyCols.name
                  ? {
                    position: "sticky",
                    left: calcLeftFor("name"),
                    zIndex: 30,
                  }
                  : undefined
              }
            >
              {m.realName}
            </td>

            {/* Nick */}
            <td
              className={`${CSS.stickyNick} ${stickyCols.nick
                ? "bg-yellow-50 dark:bg-yellow-900/100"
                : "bg-transparent"
                }`}
              style={
                stickyCols.nick
                  ? {
                    position: "sticky",
                    left: calcLeftFor("nick"),
                    zIndex: 30,
                  }
                  : undefined
              }
            >
              {m.nickname || "--"}
            </td>

            {/* Shift */}
            <td
              className={`
              ${CSS.stickyShift}
              ${stickyCols.shift ? "bg-yellow-50 dark:bg-yellow-900/100" : "bg-transparent"}
              ${planMode && requiredDays < originalRequired ? "text-red-500 font-bold" : ""}
            `}
              style={
                stickyCols.shift
                  ? { position: "sticky", left: calcLeftFor("shift"), zIndex: 30 }
                  : undefined
              }
            >
              {planMode ? (
                <span className={`${requiredDays < originalRequired ? "text-red-500 font-bold" : ""}`}>
                  {requiredDays} ngày
                </span>
              ) : (
                getShiftDisplay(
                  m,
                  shiftCfg,
                  getShiftRec(formatDateKey(selectedYear, selectedMonth, dayjs().date()), m)
                )
              )}

            </td>


            {/* DAYS */}
            {days.map((d) => {
              const key = formatDateKey(selectedYear, selectedMonth, d);
              const shiftRec = getShiftRec(key, m);
              const otRec = getOvertimeForDay(overtimes, key, m);

              const w = dayjs(key).day();
              let isRest = parseRestDay(m.restDay) === (w === 0 ? 7 : w);


              let tang = Number(
                otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0
              );
              let thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);

              const blockKey = `${m.id}_${selectedYear}-${selectedMonth}`;
              const isBlocked = manualBlockDays[blockKey]?.includes(d);

              // Nếu USER block → ép xám, không gán OT
              if (isBlocked) {
                tang = 0;
                thuong = 0;
                isRest = false;
              }
              // Nếu không block → gán OT dự tính
              else if (planMode) {
                // Có OT thật thì giữ nguyên
                if (otRec && (otRec.tangCaHomNay > 0 || otRec.thuong > 0)) {
                  // giữ nguyên tang/thuong từ otRec
                }
                // Không có OT thật → dùng OT dự tính
                else if (daysToAssign.has(d)) {
                  tang = perDayPlan;
                  thuong = 0;
                }
                else {
                  tang = 0;
                  thuong = 0;
                }
              }



              return (
                <td
                  key={d}
                  className={`p-0 ${w === 0
                    ? "bg-orange-50 dark:bg-orange-900/20"
                    : "bg-transparent"
                    }`}
                >
                  <DayCell
                    isRest={isRest}
                    isBlocked={isBlocked}
                    isCn={w === 0}
                    tang={tang}
                    thuong={thuong}
                    isPastDay={d < today}
                    isToday={d === today}
                    hasRecordToday={!!otRec || !!shiftRec}
                    onClick={() => {
                      if (planMode) {
                        // Không cho click ngày đã qua hoặc ngày hôm nay
                        if (d <= today) return;

                        handleClickPlanMode(d, m);
                      } else {
                        onCellClick?.(key, m, { shiftRec, otRec });
                      }
                    }}

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


        {/* Nhóm toggle + reset giữ layout cố định */}
        <div className="flex items-center gap-4 min-w-[240px] justify-end">
          {/* Toggle PLAN MODE */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
              Dự tính ngày tăng ca
            </span>

            <div
              className={`toggle-mini ${planMode ? "active" : ""}`}
              onClick={() => setPlanMode(!planMode)}
            >
              <div className="toggle-ball-mini" />
            </div>
          </div>
          {/* Reset chỉ xuất hiện nhưng KHÔNG làm layout thay đổi */}
          {planMode ? (
            <button
              onClick={() => {
                setManualBlockDays({});
                saveBlocks({});
              }}
              className="px-3 py-1 rounded bg-red-500 text-white text-sm shadow whitespace-nowrap"
            >
              Khôi phục
            </button>
          ) : (
            <div className="w-[100px]"></div> // giữ chỗ để ko nhảy UI
          )}

        </div>

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
              {/* STT */}
              <th
                className={`${CSS.headerCell} ${CSS.stickySTT} ${stickyCols.stt ? "bg-yellow-50 dark:bg-yellow-900/100" : ""
                  }`}
                style={
                  stickyCols.stt
                    ? {
                      position: "sticky",
                      left: calcLeftFor("stt"),
                      zIndex: 40,
                    }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>STT</span>
                  <button
                    onClick={() => toggleSticky("stt")}
                    className={`text-xs p-1 ${stickyCols.stt
                      ? "text-yellow-500"
                      : "text-gray-400 dark:text-gray-300"
                      }`}
                  >
                    📌
                  </button>
                </div>
              </th>

              {/* NAME */}
              <th
                className={`${CSS.headerCell} ${CSS.stickyName} ${stickyCols.name ? "bg-yellow-50 dark:bg-yellow-900/100" : ""
                  }`}
                style={
                  stickyCols.name
                    ? {
                      position: "sticky",
                      left: calcLeftFor("name"),
                      zIndex: 40,
                    }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>HỌ TÊN</span>
                  <button
                    onClick={() => toggleSticky("name")}
                    className={`text-xs p-1 ${stickyCols.name
                      ? "text-yellow-500"
                      : "text-gray-400 dark:text-gray-300"
                      }`}
                  >
                    📌
                  </button>
                </div>
              </th>

              {/* NICK */}
              <th
                className={`${CSS.headerCell} ${CSS.stickyNick} ${stickyCols.nick ? "bg-yellow-50 dark:bg-yellow-900/100" : ""
                  }`}
                style={
                  stickyCols.nick
                    ? {
                      position: "sticky",
                      left: calcLeftFor("nick"),
                      zIndex: 40,
                    }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>Nickname</span>
                  <button
                    onClick={() => toggleSticky("nick")}
                    className={`text-xs p-1 ${stickyCols.nick
                      ? "text-yellow-500"
                      : "text-gray-400 dark:text-gray-300"
                      }`}
                  >
                    📌
                  </button>
                </div>
              </th>

              {/* SHIFT */}
              <th
                className={`${CSS.headerCell} ${CSS.stickyShift} ${stickyCols.shift ? "bg-yellow-50 dark:bg-yellow-900/100" : ""
                  }`}
                style={
                  stickyCols.shift
                    ? {
                      position: "sticky",
                      left: calcLeftFor("shift"),
                      zIndex: 40,
                    }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span>{planMode ? "Ngày cần tăng ca" : "Giờ Lên Ca"}</span>
                  <button
                    onClick={() => toggleSticky("shift")}
                    className={`text-xs p-1 ${stickyCols.shift
                      ? "text-yellow-500"
                      : "text-gray-400 dark:text-gray-300"
                      }`}
                  >
                    📌
                  </button>
                </div>
              </th>

              {/* DAYS */}
              {weekdayLabels.map(({ day, label, weekday }) => {
                const isToday = day === today;

                return (
                  <th
                    key={day}
                    className={`
        ${CSS.headerCell}
        ${weekday === 0 ? "bg-orange-100 dark:bg-orange-900/100" : ""}
        ${isToday ? CSS.todayHeader : ""}
      `}
                    style={{ width: "36px" }}
                  >
                    <div>{label}</div>
                    <div className="font-bold">{day}</div>
                  </th>
                );
              })}

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
