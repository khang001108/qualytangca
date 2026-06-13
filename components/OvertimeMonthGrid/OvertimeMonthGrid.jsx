import React, { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import DayCell from "./DayCell";
import { CSS } from "./styles";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User } from "lucide-react";
import { ICONS } from "../../utils/iconUtils";

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

function getRequiredDays(m, bonusConfig = null) {
  const limit = m.overtimeLimit?.monthlyLimit || 0;
  const worked = m.overtimeLimit?.workedHours || 0;
  const perDay = Number(m.overtimeLimit?.perDay || 0);
  if (perDay <= 0) return 0;

  const remaining = Math.max(0, limit - worked);

  // Tính thưởng mỗi ngày nếu bonusConfig có
  let bonusPerDay = 0;
  if (bonusConfig?.batThuongTangCa) {
    const threshold = Number(bonusConfig.thuongSauBaoNhieuTieng || 0);
    const bonusAmt = Number(bonusConfig.congThemBaoNhieuGio || 0);
    if (bonusAmt > 0 && perDay >= threshold) bonusPerDay = bonusAmt;
  }

  const effectivePerDay = perDay + bonusPerDay;
  return effectivePerDay > 0 ? Math.ceil(remaining / effectivePerDay) : 0;
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
  const [bonusConfig, setBonusConfig] = useState(null);
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


  /* ----- Load shiftConfig + bonusConfig ----- */
  useEffect(() => {
    const load = async () => {
      try {
        const [daySnap, nightSnap, bonusSnap] = await Promise.all([
          getDoc(doc(db, "shiftConfig", "day")),
          getDoc(doc(db, "shiftConfig", "night")),
          getDoc(doc(db, "bonusConfig", "main")),
        ]);
        setShiftCfg({
          day: daySnap.exists() ? daySnap.data() : {},
          night: nightSnap.exists() ? nightSnap.data() : {},
        });
        setBonusConfig(bonusSnap.exists() ? bonusSnap.data() : null);
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
        let originalRequired = planMode ? getRequiredDays(m, bonusConfig) : 0;
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

              // Cap tang theo perDay nếu data cũ chưa được capped
              const perDayCap = Number(m.overtimeLimit?.perDay || 0);
              if (perDayCap > 0 && tang > perDayCap) tang = perDayCap;

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
        <div className="flex flex-wrap items-center justify-between gap-2 w-full min-w-0">
          <h3 className="text-sm font-bold tracking-wide whitespace-nowrap flex-shrink-0">
            Lịch tăng ca - Tháng {String(selectedMonth).padStart(2, "0")}/{selectedYear}
          </h3>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs border outline-none cursor-pointer bg-white text-gray-700 border-gray-300 dark:bg-[#2F3145] dark:text-[#E5E7F0] dark:border-[#3A3B54] transition flex-shrink-0 max-w-[140px]"
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
                    const origRequired = getRequiredDays(m, bonusConfig);
                    const validDays = days.filter(d => {
        