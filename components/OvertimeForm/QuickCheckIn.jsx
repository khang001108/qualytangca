// components/OvertimeForm/QuickCheckIn.jsx
// Chấm công nhanh: tick lên ca / xuống ca hàng loạt → tự tính giờ TC từ shiftConfig
import { useState, useEffect, useCallback } from "react";
import { LogIn, LogOut, CheckCircle2, Clock, ChevronDown, ChevronUp, Zap } from "lucide-react";
import dayjs from "dayjs";
import { loadShiftConfigs, timeToMinutes, minutesToHHMM } from "../../hooks/useOvertimeParser/shiftHelpers";
import {
  doc, setDoc, getDoc, serverTimestamp, collection, getDocs, updateDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";

// ---------- helpers ----------
function floorHours(diffMin) {
  if (!Number.isFinite(diffMin) || diffMin < 60) return 0;
  return Math.floor(diffMin / 60);
}

/**
 * Tính số giờ TC cho 1 NV dựa vào ca (sớm/muộn) và checkout thực tế.
 * Nếu chưa có checkout thực tế → dùng tanCaKetThuc (cuối cửa sổ) làm mốc.
 * Trả về { otHours, checkInTime, officialEndTime }
 */
function calcOTForMember({ shiftRec, shiftCfg, isNight, checkoutOverride }) {
  if (!shiftCfg) return { otHours: 0 };

  const checkinType = shiftRec?.checkinType || "muon";
  let officialEnd = null;

  if (checkinType === "som") {
    officialEnd = timeToMinutes(shiftCfg.tanCaSomBatDau);
  } else {
    officialEnd = timeToMinutes(shiftCfg.tanCaMuonBatDau);
  }

  if (officialEnd == null) return { otHours: 0 };

  // checkout thực tế hoặc ước tính = officialEnd + thêm gì đó
  // Ở đây ta để người dùng tick xuống ca → ta dùng tanCaKetThuc làm checkout mặc định
  const defaultCheckout = checkinType === "som"
    ? timeToMinutes(shiftCfg.tanCaSomKetThuc)
    : timeToMinutes(shiftCfg.tanCaMuonKetThuc);

  let checkoutMin = checkoutOverride != null ? checkoutOverride : defaultCheckout;
  if (checkoutMin == null) return { otHours: 0 };

  // wrap-around ca đêm
  let localOfficialEnd = officialEnd;
  if (isNight && localOfficialEnd < 12 * 60) localOfficialEnd += 24 * 60;
  if (isNight && checkoutMin < officialEnd) checkoutMin += 24 * 60;

  const diffMin = checkoutMin - localOfficialEnd;
  return {
    otHours: floorHours(diffMin),
    officialEndTime: minutesToHHMM(officialEnd),
    checkoutTime: minutesToHHMM(checkoutMin % (24 * 60)),
  };
}

// Upsert shiftSchedule
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

// Lưu overtime record
async function saveOvertimeRecord(userId, member, dateStr, otHours, shiftRec) {
  if (otHours <= 0) return;
  // check limit
  const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
  const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
  const remaining = memberLimit > 0 ? Math.max(memberLimit - memberWorked, 0) : otHours;
  const addHours = memberLimit > 0 ? Math.min(otHours, remaining) : otHours;
  if (addHours <= 0) return;

  // update workedHours
  try {
    if (memberLimit > 0) {
      const limitRef = doc(db, "overtimeLimits", `limit_${memberLimit}`);
      const limitSnap = await getDoc(limitRef);
      if (limitSnap.exists()) {
        const members = limitSnap.data().members || [];
        const idx = members.findIndex(m => m.id === member.id);
        if (idx >= 0) {
          members[idx] = { ...members[idx], workedHours: memberWorked + addHours };
          await updateDoc(limitRef, { members });
        }
      }
    }
  } catch (e) { console.warn("updateWorkedHours error", e); }

  // save overtime doc
  const otRef = doc(collection(db, "overtimes"));
  await setDoc(otRef, {
    userId,
    memberId: member.id,
    realName: member.realName,
    nickname: member.nickname || "",
    date: dateStr,
    checkIn: shiftRec?.lenCa || null,
    checkOut: shiftRec?.xuongCa || null,
    tangCaHomNay: addHours,
    thuong: 0,
    addedHours: addHours,
    bonusGiven: 0,
    shift: shiftRec?.shift || member.shift || "",
    createdAt: serverTimestamp(),
  });

  // mark otCounted on shiftSchedules
  await upsertShift(dateStr, member, { otCounted: true, tangCaHomNay: addHours });
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
  const [checkedIn, setCheckedIn] = useState({}); // memberId → bool
  const [checkedOut, setCheckedOut] = useState({}); // memberId → bool
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState({}); // memberId → { otHours, officialEndTime, checkoutTime }

  const dateStr = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  // Load shift config 1 lần
  useEffect(() => {
    loadShiftConfigs().then(setShiftCfg);
  }, []);

  // Tính preview OT cho mỗi NV khi checkedOut thay đổi
  useEffect(() => {
    const sched = shiftSchedules?.[dateStr] || {};
    const next = {};
    members.forEach((m) => {
      if (!checkedOut[m.id]) return;
      const isNight = m.shift?.toLowerCase().includes("đêm");
      const cfg = isNight ? shiftCfg.night : shiftCfg.day;
      const rec = Object.values(sched).find(
        (s) => s.memberId === m.id || s.realName === m.realName
      );
      const xuongCaMin = rec?.xuongCa ? timeToMinutes(rec.xuongCa) : null;
      next[m.id] = calcOTForMember({
        shiftRec: rec,
        shiftCfg: cfg,
        isNight,
        checkoutOverride: xuongCaMin,
      });
    });
    setPreview(next);
  }, [checkedOut, shiftCfg, shiftSchedules, dateStr, members]);

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
      const sched = shiftSchedules?.[dateStr] || {};
      let countIn = 0, countOut = 0, countOT = 0;

      for (const m of members) {
        const isNight = m.shift?.toLowerCase().includes("đêm");
        const cfg = isNight ? shiftCfg.night : shiftCfg.day;
        const rec = Object.values(sched).find(
          (s) => s.memberId === m.id || s.realName === m.realName
        );

        if (checkedIn[m.id] && !rec?.lenCa) {
          // Điền giờ lên ca mặc định = giữa cửa sổ sớm
          const defaultIn = cfg
            ? minutesToHHMM(
                Math.round(
                  (timeToMinutes(cfg.lenCaSomBatDau) +
                    timeToMinutes(cfg.lenCaSomKetThuc)) /
                    2
                )
              )
            : null;
          if (defaultIn) {
            await upsertShift(dateStr, m, {
              lenCa: defaultIn,
              checkinType: "som",
              type: "work",
              shift: m.shift || "ngày",
            });
            countIn++;
          }
        }

        if (checkedOut[m.id]) {
          const { otHours } = preview[m.id] || {};
          // Điền giờ xuống ca mặc định = tanCaMuonKetThuc
          const defaultOut = cfg
            ? minutesToHHMM(timeToMinutes(cfg.tanCaMuonKetThuc))
            : null;
          const currentCheckout = rec?.xuongCa || defaultOut;

          if (currentCheckout) {
            await upsertShift(dateStr, m, {
              xuongCa: currentCheckout,
              type: "work",
            });
            countOut++;
          }

          if (otHours > 0 && !rec?.otCounted) {
            await saveOvertimeRecord(user.uid, m, dateStr, otHours, {
              ...rec,
              xuongCa: currentCheckout,
            });
            countOT += otHours;
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
  }, [checkedIn, checkedOut, members, dateStr, shiftCfg, shiftSchedules, preview, user, showToast, onDone]);

  const sched = shiftSchedules?.[dateStr] || {};

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
          {members.filter(m => checkedIn[m.id] || checkedOut[m.id]).length}/{members.length} NV
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-blue-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-400" />
        )}
      </button>

      {open && (
        <div className="bg-white dark:bg-gray-900 px-3 py-3 space-y-3">
          {/* Hàng tick tất cả */}
          <div className="flex gap-2">
            <button
              onClick={toggleAllIn}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition ${
                allCheckedIn
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Tất cả lên ca
            </button>
            <button
              onClick={toggleAllOut}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition ${
                allCheckedOut
                  ? "bg-red-500 border-red-500 text-white"
                  : "border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              Tất cả xuống ca
            </button>
          </div>

          {/* Danh sách NV */}
          <div className="space-y-1.5">
            {members.map((m) => {
              const isNight = m.shift?.toLowerCase().includes("đêm");
              const rec = Object.values(sched).find(
                (s) => s.memberId === m.id || s.realName === m.realName
              );
              const alreadyIn = !!rec?.lenCa;
              const alreadyOut = !!rec?.xuongCa;
              const existingOT = Number(rec?.tangCaHomNay || 0);
              const { otHours, officialEndTime } = preview[m.id] || {};

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

                  {/* Tên + info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {m.realName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {alreadyIn && (
                        <span className="text-[9px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
                          <LogIn className="w-2.5 h-2.5" />{rec.lenCa}
                        </span>
                      )}
                      {alreadyOut && (
                        <span className="text-[9px] text-red-500 dark:text-red-400 flex items-center gap-0.5">
                          <LogOut className="w-2.5 h-2.5" />{rec.xuongCa}
                        </span>
                      )}
                      {existingOT > 0 && (
                        <span className="text-[9px] font-bold text-orange-500">+{existingOT}h TC</span>
                      )}
                      {checkedOut[m.id] && otHours > 0 && !existingOT && (
                        <span className="text-[9px] font-bold text-orange-400">
                          → +{otHours}h TC (sau {officialEndTime})
                        </span>
                      )}
                      {checkedOut[m.id] && (otHours == null || otHours === 0) && !existingOT && (
                        <span className="text-[9px] text-gray-400">→ 0h TC</span>
                      )}
                    </div>
                  </div>

                  {/* Checkbox lên ca */}
                  <button
                    onClick={() =>
                      setCheckedIn((p) => ({ ...p, [m.id]: !p[m.id] }))
                    }
                    title="Lên ca"
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                      checkedIn[m.id]
                        ? "bg-green-500 border-green-500 text-white"
                        : alreadyIn
                        ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-600"
                        : "border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 hover:border-green-400"
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                  </button>

                  {/* Checkbox xuống ca */}
                  <button
                    onClick={() =>
                      setCheckedOut((p) => ({ ...p, [m.id]: !p[m.id] }))
                    }
                    title="Xuống ca"
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                      checkedOut[m.id]
                        ? "bg-red-500 border-red-500 text-white"
                        : alreadyOut
                        ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-500"
                        : "border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 hover:border-red-400"
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Nút lưu */}
          {members.some((m) => checkedIn[m.id] || checkedOut[m.id]) && (
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
                  Lưu chấm công ({members.filter((m) => checkedIn[m.id] || checkedOut[m.id]).length} NV)
                </>
              )}
            </button>
          )}

          {/* Ghi chú */}
          <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center leading-relaxed">
            Giờ TC tự tính từ cấu hình ca · Ca đêm/ngày theo phân công NV
          </p>
        </div>
      )}
    </div>
  );
}
