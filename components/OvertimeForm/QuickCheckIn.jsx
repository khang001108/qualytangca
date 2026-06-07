// components/OvertimeForm/QuickCheckIn.jsx
// Chấm công nhanh: tick lên ca / xuống ca hàng loạt
// Check-in = giờ thực tế trong shiftSchedule (hoặc giữa cửa sổ muộn)
// Check-out = officialEnd + perDay*60
// OT hours  = perDay từ overtimeLimits config (không tính lại)

import { useState, useEffect, useCallback } from "react";
import { LogIn, LogOut, CheckCircle2, ChevronDown, ChevronUp, Zap } from "lucide-react";
import dayjs from "dayjs";
import {
  loadShiftConfigs,
  timeToMinutes,
  minutesToHHMM,
} from "../../hooks/useOvertimeParser/shiftHelpers";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

// ---------- helpers ----------
/** officialEnd + perDay*60 → checkout string */
function calcCheckout(officialEndMin, perDay, isNight) {
  if (officialEndMin == null || !perDay) return null;
  let out = officialEndMin + Math.round(perDay * 60);
  if (isNight && out >= 24 * 60) out = out % (24 * 60);
  return minutesToHHMM(out);
}

// Upsert shiftSchedule doc
async function upsertShift(dateStr, member, data) {
  const docId = `${dateStr}__${member.id}`;
  const ref = doc(db, "shiftSchedules", docId);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    } else {
      await setDoc(ref, {
        memberId: member.id,
        realName: member.realName,
        nickname: member.nickname || "",
        shift: member.shift || "ngày",
        date: dateStr,
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.warn("upsertShift error", e);
  }
}

// Lưu overtime record + update workedHours
async function saveOvertimeRecord(userId, member, dateStr, otHours, checkIn, checkOut) {
  if (otHours <= 0) return;
  const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
  const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
  const addHours =
    memberLimit > 0 ? Math.min(otHours, Math.max(memberLimit - memberWorked, 0)) : otHours;
  if (addHours <= 0) return;

  // update workedHours trong members collection
  try {
    const memRef = doc(db, "members", member.id);
    await updateDoc(memRef, {
      "overtimeLimit.workedHours": memberWorked + addHours,
      "overtimeLimit.remaining": Math.max(memberLimit - memberWorked - addHours, 0),
    });
  } catch (e) {
    console.warn("updateWorkedHours error", e);
  }

  // update overtimeLimits doc
  try {
    if (memberLimit > 0) {
      const limitRef = doc(db, "overtimeLimits", `limit_${memberLimit}`);
      const limitSnap = await getDoc(limitRef);
      if (limitSnap.exists()) {
        const mList = limitSnap.data().members || [];
        const idx = mList.findIndex((m) => m.id === member.id);
        if (idx >= 0) {
          mList[idx] = { ...mList[idx], workedHours: memberWorked + addHours };
          await updateDoc(limitRef, { members: mList });
        }
      }
    }
  } catch (e) {
    console.warn("updateOvertimeLimits error", e);
  }

  // overtime record
  const otRef = doc(collection(db, "overtimes"));
  await setDoc(otRef, {
    userId,
    memberId: member.id,
    realName: member.realName,
    nickname: member.nickname || "",
    date: dateStr,
    checkIn: checkIn || null,
    checkOut: checkOut || null,
    tangCaHomNay: addHours,
    thuong: 0,
    addedHours: addHours,
    bonusGiven: 0,
    shift: member.shift || "",
    createdAt: serverTimestamp(),
  });

  // đánh dấu otCounted
  await upsertShift(dateStr, member, { otCounted: true, tangCaHomNay: addHours });
}

// Load perDay từ overtimeLimits cho 1 member
async function loadPerDay(member) {
  const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
  if (!memberLimit) return null;
  try {
    const snap = await getDoc(doc(db, "overtimeLimits", `limit_${memberLimit}`));
    if (snap.exists()) return Number(snap.data().perDay || 0) || null;
  } catch (e) { /* ignore */ }
  return null;
}

// ---------- Component ----------
export default function QuickCheckIn({
  user,
  members = [],
  selectedDate,
  shiftSchedules = {},
  onDone,
  showToast,
}) {
  const [open, setOpen] = useState(false);
  const [shiftCfg, setShiftCfg] = useState({ day: null, night: null });
  const [perDayMap, setPerDayMap] = useState({}); // memberId → perDay (số)
  const [checkedIn, setCheckedIn] = useState({});
  const [checkedOut, setCheckedOut] = useState({});
  const [saving, setSaving] = useState(false);

  const dateStr = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  // Load shift config
  useEffect(() => {
    loadShiftConfigs().then(setShiftCfg);
  }, []);

  // Load perDay cho từng NV khi mở panel
  useEffect(() => {
    if (!open || members.length === 0) return;
    const map = {};
    Promise.all(
      members.map(async (m) => {
        const pd = await loadPerDay(m);
        map[m.id] = pd;
      })
    ).then(() => setPerDayMap({ ...map }));
  }, [open, members]);

  /** Tính thông tin hiển thị cho 1 NV */
  function getMemberInfo(m) {
    const isNight = m.shift?.toLowerCase().includes("đêm");
    const cfg = isNight ? shiftCfg.night : shiftCfg.day;
    const sched = shiftSchedules?.[dateStr] || {};
    const rec = Object.values(sched).find(
      (s) => s.memberId === m.id || s.realName === m.realName
    );
    const perDay = perDayMap[m.id] ?? null;

    // check-in: ưu tiên giờ thực tế, không thì dùng giữa cửa sổ muộn
    let checkInTime = rec?.lenCa || null;
    let checkinType = rec?.checkinType || "muon";
    if (!checkInTime && cfg) {
      const mid = Math.round(
        (timeToMinutes(cfg.lenCaMuonBatDau) + timeToMinutes(cfg.lenCaMuonKetThuc)) / 2
      );
      checkInTime = minutesToHHMM(mid);
      checkinType = "muon";
    }

    // officialEnd = tanCa...BatDau tuỳ checkinType
    let officialEndMin = null;
    if (cfg) {
      officialEndMin =
        checkinType === "som"
          ? timeToMinutes(cfg.tanCaSomBatDau)
          : timeToMinutes(cfg.tanCaMuonBatDau);
    }

    // check-out = officialEnd + perDay*60
    const checkOutTime =
      perDay && officialEndMin != null
        ? calcCheckout(officialEndMin, perDay, isNight)
        : rec?.xuongCa || null;

    const officialEndStr = officialEndMin != null ? minutesToHHMM(officialEndMin) : null;

    return {
      isNight,
      rec,
      checkInTime,
      checkOutTime,
      officialEndStr,
      perDay,
      checkinType,
    };
  }

  const allCheckedIn = members.length > 0 && members.every((m) => checkedIn[m.id]);
  const allCheckedOut = members.length > 0 && members.every((m) => checkedOut[m.id]);

  const toggleAllIn = () => {
    const val = !allCheckedIn;
    const next = {};
    members.forEach((m) => (next[m.id] = val));
    setCheckedIn(next);
  };

  const toggleAllOut = () => {
    const val = !allCheckedOut;
    const next = {};
    members.forEach((m) => (next[m.id] = val));
    setCheckedOut(next);
  };

  const handleSave = useCallback(async () => {
    const anySelected = members.some((m) => checkedIn[m.id] || checkedOut[m.id]);
    if (!anySelected) {
      showToast("error", "⚠️ Chưa chọn ai để chấm công.");
      return;
    }
    setSaving(true);
    try {
      let countIn = 0, countOut = 0, countOT = 0;

      for (const m of members) {
        const { checkInTime, checkOutTime, perDay, rec, checkinType, isNight } = getMemberInfo(m);

        if (checkedIn[m.id]) {
          await upsertShift(dateStr, m, {
            lenCa: checkInTime,
            checkinType,
            type: "work",
            shift: m.shift || "ngày",
          });
          countIn++;
        }

        if (checkedOut[m.id] && checkOutTime) {
          await upsertShift(dateStr, m, {
            xuongCa: checkOutTime,
            type: "work",
          });
          countOut++;

          if (perDay && perDay > 0 && !rec?.otCounted) {
            await saveOvertimeRecord(
              user.uid,
              m,
              dateStr,
              perDay,
              checkInTime,
              checkOutTime
            );
            countOT += perDay;
          }
        }
      }

      showToast(
        "success",
        `✅ Đã chấm: ${countIn} lên ca, ${countOut} xuống ca${countOT > 0 ? `, +${countOT}h TC` : ""}`
      );
      setCheckedIn({});
      setCheckedOut({});
      onDone?.();
    } catch (e) {
      console.error(e);
      showToast("error", "❌ Lỗi khi lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedIn, checkedOut, members, dateStr, shiftCfg, shiftSchedules, perDayMap, user]);

  const selectedCount = members.filter((m) => checkedIn[m.id] || checkedOut[m.id]).length;

  return (
    <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-left"
      >
        <Zap className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex-1">
          Chấm công nhanh
        </span>
        <span className="text-[10px] text-blue-400 dark:text-blue-500 mr-1">
          {selectedCount}/{members.length} NV
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-blue-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-400" />
        )}
      </button>

      {open && (
        <div className="bg-white dark:bg-gray-900 px-3 py-3 space-y-3">
          {/* Tất cả lên ca / xuống ca */}
          <div className="flex gap-2">
            <button
              onClick={toggleAllIn}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition ${
                allCheckedIn
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Tất cả lên ca
            </button>
            <button
              onClick={toggleAllOut}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition ${
                allCheckedOut
                  ? "bg-red-500 border-red-500 text-white"
                  : "border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              }`}
            >
              <LogOut className="w-3.5 h-3.5" /> Tất cả xuống ca
            </button>
          </div>

          {/* Danh sách NV */}
          <div className="space-y-1.5">
            {members.map((m) => {
              const {
                isNight,
                rec,
                checkInTime,
                checkOutTime,
                officialEndStr,
                perDay,
              } = getMemberInfo(m);

              const alreadyIn = !!rec?.lenCa;
              const alreadyOut = !!rec?.xuongCa;
              const existingOT = Number(rec?.tangCaHomNay || 0);

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50"
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      isNight
                        ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                        : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
                    }`}
                  >
                    {(m.nickname || m.realName)?.[0]?.toUpperCase()}
                  </div>

                  {/* Tên + giờ preview */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {m.realName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {/* Giờ check-in sẽ dùng */}
                      {(checkedIn[m.id] || alreadyIn) && (
                        <span className="text-[9px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
                          <LogIn className="w-2.5 h-2.5" />
                          {alreadyIn ? rec.lenCa : checkInTime}
                        </span>
                      )}
                      {/* Giờ check-out sẽ dùng */}
                      {(checkedOut[m.id] || alreadyOut) && (
                        <span className="text-[9px] text-red-500 dark:text-red-400 flex items-center gap-0.5">
                          <LogOut className="w-2.5 h-2.5" />
                          {alreadyOut ? rec.xuongCa : checkOutTime || "--"}
                        </span>
                      )}
                      {/* OT preview */}
                      {existingOT > 0 && (
                        <span className="text-[9px] font-bold text-orange-500">
                          +{existingOT}h TC ✓
                        </span>
                      )}
                      {checkedOut[m.id] && perDay && !existingOT && (
                        <span className="text-[9px] font-bold text-orange-400">
                          → +{perDay}h TC (sau {officialEndStr})
                        </span>
                      )}
                      {checkedOut[m.id] && !perDay && !existingOT && (
                        <span className="text-[9px] text-gray-400">→ chưa cấu hình TC</span>
                      )}
                    </div>
                  </div>

                  {/* Nút lên ca */}
                  <button
                    onClick={() =>
                      setCheckedIn((p) => ({ ...p, [m.id]: !p[m.id] }))
                    }
                    title="Lên ca"
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                      checkedIn[m.id]
                        ? "bg-green-500 border-green-500 text-white"
                        : alreadyIn
                        ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-500"
                        : "border-gray-300 dark:border-gray-600 text-gray-300 hover:border-green-400"
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                  </button>

                  {/* Nút xuống ca */}
                  <button
                    onClick={() =>
                      setCheckedOut((p) => ({ ...p, [m.id]: !p[m.id] }))
                    }
                    title="Xuống ca"
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                      checkedOut[m.id]
                        ? "bg-red-500 border-red-500 text-white"
                        : alreadyOut
                        ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-400"
                        : "border-gray-300 dark:border-gray-600 text-gray-300 hover:border-red-400"
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Nút lưu */}
          {selectedCount > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <span className="animate-pulse">Đang lưu...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Lưu chấm công ({selectedCount} NV)
                </>
              )}
            </button>
          )}

          <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center">
            Check-out = tan ca HC + số giờ TC cấu hình · Ca đêm/ngày theo phân công NV
          </p>
        </div>
      )}
    </div>
  );
}
