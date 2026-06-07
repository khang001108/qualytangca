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
  const [viewMode, setViewMode] = useState("rest");
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
              // Nếu USER block (nghỉ dự tính)
              if (isBlocked) {
                // 🔥 NẾU CÓ OT THẬT → GIỮ OT, KHÔNG ÉP 0
                if (otRec && (Number(otRec.tangCaHomNay) > 0 || Number(otRec.thuong) > 0)) {
                  // giữ nguyên tang / thuong
                }
                // ❌ CHỈ khi KHÔNG có OT thật mới ép 0
                else {
                  tang = 0;
                  thuong = 0;
                  isRest = false;
                }
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

        {/* Dòng 1: Tiêu đề + Select */}
        <div className="flex items-center justify-between gap-2 w-full">
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
            <option value="otAsc">Giờ TC ít nhất</option>
            <option value="otDesc">Giờ TC nhiều nhất</option>
          </select>
        </div>

        {/* Dòng 2: Toggle dự tính + Khôi phục */}
        <div className="flex items-center gap-3 w-full pt-1 border-t border-gray-200 dark:border-gray-700/50 mt-1">
          <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
            📅 Dự tính ngày tăng ca
          </span>
          <div
            className={`toggle-mini ${planMode ? "active" : ""}`}
            onClick={() => setPlanMode(!planMode)}
          >
            <div className="toggle-ball-mini" />
          </div>
          {planMode && (
            <button
              onClick={() => { setManualBlockDays({}); saveBlocks({}); }}
              className="ml-auto px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium shadow transition whitespace-nowrap"
            >
              Khôi phục
            </button>
          )}
        </div>

      </div>



      {/* ── Card per member layout ── */}
      <div className="space-y-2 mt-3">
        {[{ label: "☀ Ca ngày", list: sortedDay, night: false }, { label: "🌙 Ca đêm", list: sortedNight, night: true }].map(({ label, list, night }) =>
          list.length > 0 && (
            <div key={label}>
              <div className={`flex items-center gap-2 px-1 mb-1.5 ${night ? "mt-3" : ""}`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${night ? "text-indigo-500 dark:text-indigo-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                  {label} ({list.length})
                </span>
                <div className={`flex-1 h-px ${night ? "bg-indigo-200 dark:bg-indigo-800/50" : "bg-yellow-200 dark:bg-yellow-800/50"}`} />
              </div>
              <div className="space-y-1.5">
                {list.map((m, idx) => {
                  // Pre-compute cell data
                  const blockKey = `${m.id}_${selectedYear}-${selectedMonth}`;
                  let requiredDays = 0, perDayPlan = 0;
                  const daysToAssign = new Set();
                  if (planMode) {
                    const lastRealOT = getLastRealOTDay(m, days, selectedYear, selectedMonth, overtimes);
                    const todayN = dayjs().date();
                    perDayPlan = Number(m.overtimeLimit?.perDay || 0);
                    const origRequired = getRequiredDays(m);
                    const validDays = days.filter(d => {
                      const key = formatDateKey(selectedYear, selectedMonth, d);
                      const w = dayjs(key).day(); const wd = w === 0 ? 7 : w;
                      if (d < todayN || d <= lastRealOT) return false;
                      if (parseRestDay(m.restDay) === wd) return false;
                      const ot = getOvertimeForDay(overtimes, key, m);
                      if (ot && (Number(ot.tangCaHomNay) > 0 || Number(ot.thuong) > 0)) return false;
                      if (manualBlockDays[blockKey]?.includes(d)) return false;
                      return true;
                    });
                    requiredDays = Math.min(origRequired, validDays.length);
                    validDays.slice(0, requiredDays).forEach(d => daysToAssign.add(d));
                  }

                  const cellData = weekdayLabels.map(({ day: d, weekday: w }) => {
                    const key = formatDateKey(selectedYear, selectedMonth, d);
                    const shiftRec = getShiftRec(key, m);
                    const otRec = getOvertimeForDay(overtimes, key, m);
                    const isRest = shiftRec?.type === "leave" || shiftRec?.type === "rest";
                    const isBlocked = planMode && manualBlockDays[blockKey]?.includes(d);
                    let tang = Number(otRec?.tangCaHomNay ?? shiftRec?.tangCaHomNay ?? 0);
                    let thuong = Number(otRec?.thuong ?? shiftRec?.thuong ?? 0);
                    if (!isRest && !isBlocked && planMode) {
                      if (!otRec || (tang === 0 && thuong === 0)) {
                        tang = daysToAssign.has(d) ? perDayPlan : 0; thuong = 0;
                      }
                    }
                    return { day: d, weekday: w, key, isRest, isBlocked, tang, thuong, hasRecord: !!otRec || !!shiftRec };
                  });

                  const workedHours = Number(m.overtimeLimit?.workedHours || 0);
                  const limitH = Number(m.overtimeLimit?.monthlyLimit || 0);
                  const remain = Math.max(limitH - workedHours, 0);
                  const pct = limitH > 0 ? Math.min((workedHours / limitH) * 100, 100) : 0;
                  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : night ? "#6366f1" : "#eab308";
                  const otDaysCount = daysToAssign.size + cellData.filter(c => !planMode && (c.tang > 0 || c.thuong > 0)).length;

                  return (
                    <MemberPlanCard
                      key={m.id}
                      m={m} idx={idx} isNight={night}
                      cellData={cellData} planMode={planMode}
                      weekdayLabels={weekdayLabels} today={today}
                      manualBlockDays={manualBlockDays} blockKey={blockKey}
                      setManualBlockDays={setManualBlockDays} saveBlocks={saveBlocks}
                      workedHours={workedHours} limitH={limitH} remain={remain}
                      pct={pct} barColor={barColor} otDaysCount={otDaysCount}
                      requiredDays={requiredDays}
                    />
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Card từng nhân viên ──
function MemberPlanCard({ m, idx, isNight, cellData, planMode, weekdayLabels, today,
  manualBlockDays, blockKey, setManualBlockDays, saveBlocks,
  workedHours, limitH, remain, pct, barColor, otDaysCount, requiredDays }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`bg-white dark:bg-gray-800/80 border rounded-xl overflow-hidden transition-all ${open ? (isNight ? "border-indigo-300 dark:border-indigo-700" : "border-yellow-300 dark:border-yellow-700") : "border-gray-100 dark:border-gray-700/60"}`}>

      {/* Main row — tap to expand */}
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 w-4 shrink-0">{idx + 1}</span>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${isNight ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300" : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"}`}>
          {(m.realName || "?")?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">{m.realName}</p>
          <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight truncate">{m.nickname || ""}</p>
        </div>
        <div className="text-right shrink-0 mr-1">
          <p className="text-[10px] font-bold leading-tight">
            <span className={isNight ? "text-indigo-500 dark:text-indigo-400" : "text-yellow-600 dark:text-yellow-400"}>{workedHours}h</span>
            <span className="text-gray-300 dark:text-gray-600 font-normal">/{limitH}h</span>
          </p>
          {planMode && <p className="text-[9px] text-green-500 dark:text-green-400">{requiredDays} ngày cần TC</p>}
          {limitH > 0 && (
            <div className="w-14 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-0.5 ml-auto">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
          )}
        </div>
        <span className="text-gray-400 text-[10px] shrink-0">{open ? "▲" : "▼"}</span>
      </div>

      {/* Expanded: day cells */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700/50 px-2 py-2.5 bg-gray-50/50 dark:bg-gray-800/20">
          <div className="overflow-x-auto">
            {/* Day headers */}
            <div className="flex gap-0.5 min-w-max mb-1">
              {weekdayLabels.map(({ day, label, weekday }) => (
                <div key={day} className={`w-8 text-center text-[8px] font-bold leading-tight shrink-0 ${weekday === 0 ? "text-orange-400" : "text-gray-400 dark:text-gray-500"} ${day === today ? "text-blue-500 dark:text-blue-400" : ""}`}>
                  <div>{label}</div><div className="font-normal">{day}</div>
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="flex gap-0.5 min-w-max">
              {cellData.map(({ day: d, weekday: w, isRest, isBlocked, tang, thuong }) => {
                const isOT = (tang > 0 || thuong > 0) && !isRest;
                const isToday = d === today;
                let cls = "bg-gray-100 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500";
                let txt = "—";
                if (isToday) { cls = "bg-blue-400 text-white font-bold"; txt = d; }
                if (isRest)  { cls = "bg-sky-100 dark:bg-sky-900/30 text-sky-500 dark:text-sky-400 font-medium"; txt = "N"; }
                if (isOT && !isBlocked) {
                  cls = planMode
                    ? "bg-emerald-400 dark:bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-500"
                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold";
                  txt = planMode ? "✓" : `${(tang + thuong).toFixed(0)}h`;
                }
                if (w === 0 && !isOT && !isRest && !isToday) { cls = "bg-orange-100 dark:bg-orange-900/20 text-orange-400"; }
                if (isBlocked) { cls = "bg-gray-200 dark:bg-gray-600/60 text-gray-400 opacity-50 line-through cursor-pointer"; txt = "✗"; }

                return (
                  <div key={d} onClick={() => {
                    if (!planMode || d <= today) return;
                    const cur = manualBlockDays[blockKey] || [];
                    const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d];
                    const nb = { ...manualBlockDays, [blockKey]: next };
                    setManualBlockDays(nb); saveBlocks(nb);
                  }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] shrink-0 transition-all select-none ${cls}`}>
                    {txt}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chú thích */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-[9px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" />TC</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 inline-block" />Nghỉ</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-orange-100 inline-block" />CN</span>
            <span className="flex items-center gap-0.5"><span className="w-2.5 h-2.5 rounded bg-blue-400 inline-block" />Hôm nay</span>
            {planMode && <span className="ml-auto text-orange-400 font-medium">Tap ô xanh để block</span>}
          </div>
        </div>
      )}
    </div>
  );
}
