// components/OvertimeForm/QuickCheckIn.jsx
import { useState, useEffect, useCallback } from "react";
import { LogIn, LogOut, CheckCircle2, ChevronDown, ChevronUp, Zap, User } from "lucide-react";
import { ICONS } from "../../utils/iconUtils";
import dayjs from "dayjs";
import {
  loadShiftConfigs,
  timeToMinutes,
  minutesToHHMM,
} from "../../hooks/useOvertimeParser/shiftHelpers";
import {
  doc, setDoc, getDoc, getDocs, collection,
  serverTimestamp, updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

// ─── Helpers ──────────────────────────────────────────────────
/** officialEnd (phút) + perDay*60 → "HH:MM" */
function calcCheckoutStr(officialEndMin, perDay, isNight) {
  if (officialEndMin == null || !perDay) return null;
  let out = officialEndMin + Math.round(perDay * 60);
  if (isNight) out = out % (24 * 60);
  return minutesToHHMM(out);
}

/** Giờ lên ca mặc định theo checkinType + cfg */
function defaultCheckInStr(cfg, checkinType) {
  if (!cfg) return null;
  if (checkinType === "som") {
    const mid = Math.round(
      (timeToMinutes(cfg.lenCaSomBatDau) + timeToMinutes(cfg.lenCaSomKetThuc)) / 2
    );
    return minutesToHHMM(mid);
  }
  const mid = Math.round(
    (timeToMinutes(cfg.lenCaMuonBatDau) + timeToMinutes(cfg.lenCaMuonKetThuc)) / 2
  );
  return minutesToHHMM(mid);
}

/** officialEnd theo checkinType */
function getOfficialEnd(cfg, checkinType) {
  if (!cfg) return null;
  return checkinType === "som"
    ? timeToMinutes(cfg.tanCaSomBatDau)
    : timeToMinutes(cfg.tanCaMuonBatDau);
}

// ─── Firestore ops ────────────────────────────────────────────
async function upsertShift(dateStr, member, data) {
  const docId = `${dateStr}__${member.id}`;
  const ref = doc(db, "shiftSchedules", docId);
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
}

async function loadBonusConfig() {
  try {
    const snap = await getDoc(doc(db, "bonusConfig", "main"));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

async function loadLimitDoc(monthlyLimit) {
  if (!monthlyLimit) return null;
  try {
    const snap = await getDoc(doc(db, "overtimeLimits", `limit_${monthlyLimit}`));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch { return null; }
}

/** Tính bonus giống hệt parser gốc */
function calcBonus(bonus, member, addHours) {
  try {
    const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
    const limitKey = String(memberLimit || 0);
    const bonusEnabled = Boolean(bonus?.batThuongTangCa);
    const bonusEvery = Number(bonus?.thuongSauBaoNhieuTieng || 0);
    const bonusAmount = Number(bonus?.congThemBaoNhieuGio || 0);
    const selectedLimits = bonus?.cacNhanhDuocThuong || [];
    const noBonus = (bonus?.cacMaKhongThuong || []);

    const isNoBonus = noBonus.includes(member.realName) || noBonus.includes(member.nickname);
    const isLimitSelected = selectedLimits.includes(limitKey);

    if (bonusEnabled && !isNoBonus && isLimitSelected && bonusEvery > 0 && bonusAmount > 0) {
      return addHours >= bonusEvery ? bonusAmount : 0;
    }
  } catch { /* ignore */ }
  return 0;
}

/** Lưu overtime record + update workedHours */
async function saveOTRecord(userId, member, dateStr, otHours, bonusGiven, checkIn, checkOut) {
  if (otHours <= 0) return;
  const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
  const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
  const addHours = memberLimit > 0
    ? Math.min(otHours, Math.max(memberLimit - memberWorked, 0))
    : otHours;
  if (addHours <= 0) return;

  // update members doc
  try {
    await updateDoc(doc(db, "members", member.id), {
      "overtimeLimit.workedHours": memberWorked + addHours,
      "overtimeLimit.remaining": Math.max(memberLimit - memberWorked - addHours, 0),
    });
  } catch { /* ignore */ }

  // update overtimeLimits member entry
  try {
    if (memberLimit > 0) {
      const limitDoc = await loadLimitDoc(memberLimit);
      if (limitDoc) {
        const mList = limitDoc.members || [];
        const idx = mList.findIndex(m => m.id === member.id);
        if (idx >= 0) {
          const ex = mList[idx];
          const newGioDaLam = Number(ex.gioDaLam || 0) + addHours;
          const totalPlan = Number(ex.tongGioKeHoach || limitDoc.limit || 0);
          mList[idx] = {
            ...ex,
            gioDaLam: newGioDaLam,
            gioConLai: Math.max(totalPlan - newGioDaLam, 0),
            soNgayDaLam: Number(ex.soNgayDaLam || 0) + 1,
            ngayConLai: Math.max(Number(ex.ngayConLai ?? limitDoc.days ?? 0) - 1, 0),
          };
          await updateDoc(doc(db, "overtimeLimits", `limit_${memberLimit}`), { members: mList });
        }
      }
    }
  } catch { /* ignore */ }

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
    thuong: bonusGiven,
    addedHours: addHours,
    bonusGiven,
    shift: member.shift || "",
    createdAt: serverTimestamp(),
  });

  // đánh dấu otCounted
  await upsertShift(dateStr, member, { otCounted: true, tangCaHomNay: addHours });
}

// ─── Load perDay cho từng member ──────────────────────────────
async function loadPerDay(member) {
  const ml = Number(member.overtimeLimit?.monthlyLimit || 0);
  if (!ml) return null;
  try {
    const snap = await getDoc(doc(db, "overtimeLimits", `limit_${ml}`));
    if (snap.exists()) return Number(snap.data().perDay || 0) || null;
  } catch { /* ignore */ }
  return null;
}

// ─── Component ────────────────────────────────────────────────
export default function QuickCheckIn({
  user, members = [], selectedDate, shiftSchedules = {}, onDone, showToast,
}) {
  const [open, setOpen] = useState(false);
  const [shiftCfg, setShiftCfg] = useState({ day: null, night: null });
  const [bonusCfg, setBonusCfg] = useState({});
  const [perDayMap, setPerDayMap] = useState({});
  const [checkedIn, setCheckedIn] = useState({});
  const [checkedOut, setCheckedOut] = useState({});
  const [saving, setSaving] = useState(false);

  const dateStr = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    loadShiftConfigs().then(setShiftCfg);
    loadBonusConfig().then(setBonusCfg);
  }, []);

  useEffect(() => {
    if (!open || members.length === 0) return;
    const map = {};
    Promise.all(members.map(async (m) => {
      map[m.id] = await loadPerDay(m);
    })).then(() => setPerDayMap({ ...map }));
  }, [open, members]);

  /** Tính đầy đủ thông tin 1 NV */
  function getMemberInfo(m) {
    const isNight = m.shift?.toLowerCase().includes("đêm");
    const cfg = isNight ? shiftCfg.night : shiftCfg.day;
    const sched = shiftSchedules?.[dateStr] || {};
    const rec = Object.values(sched).find(
      s => s.memberId === m.id || s.realName === m.realName
    );

    // ✅ checkinType: đọc từ shiftStart trong shiftSchedules (được ghi lúc phân ca)
    // "lên_ca_ngày_sớm" / "lên_ca_đêm_sớm" → "som", còn lại → "muon"
    const shiftStart = rec?.shiftStart || m.shiftStart || "";
    const checkinType = shiftStart.includes("sớm") || shiftStart.includes("som")
      ? "som"
      : rec?.checkinType || "muon";

    // check-in: giờ thực tế hoặc default theo checkinType đúng
    const checkInTime = rec?.lenCa || defaultCheckInStr(cfg, checkinType);

    // officialEnd theo checkinType đúng
    const officialEndMin = getOfficialEnd(cfg, checkinType);
    const officialEndStr = officialEndMin != null ? minutesToHHMM(officialEndMin) : null;

    // perDay từ config
    const perDay = perDayMap[m.id] ?? null;

    // check-out = officialEnd + perDay*60
    const checkOutTime = perDay && officialEndMin != null
      ? calcCheckoutStr(officialEndMin, perDay, isNight)
      : rec?.xuongCa || null;

    // bonus preview
    const bonusGiven = perDay ? calcBonus(bonusCfg, m, perDay) : 0;

    return { isNight, rec, checkInTime, checkOutTime, officialEndStr, perDay, checkinType, bonusGiven };
  }

  const allCheckedIn = members.length > 0 && members.every(m => checkedIn[m.id]);
  const allCheckedOut = members.length > 0 && members.every(m => checkedOut[m.id]);

  const toggleAllIn = () => {
    const val = !allCheckedIn;
    setCheckedIn(Object.fromEntries(members.map(m => [m.id, val])));
  };
  const toggleAllOut = () => {
    const val = !allCheckedOut;
    setCheckedOut(Object.fromEntries(members.map(m => [m.id, val])));
  };

  const handleSave = useCallback(async () => {
    const anySelected = members.some(m => checkedIn[m.id] || checkedOut[m.id]);
    if (!anySelected) { showToast("error", "⚠️ Chưa chọn ai để chấm công."); return; }
    setSaving(true);
    try {
      let countIn = 0, countOut = 0, countOT = 0, countBonus = 0;
      for (const m of members) {
        const { checkInTime, checkOutTime, perDay, rec, checkinType, bonusGiven } = getMemberInfo(m);

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
          await upsertShift(dateStr, m, { xuongCa: checkOutTime, type: "work" });
          countOut++;

          if (perDay && perDay > 0 && !rec?.otCounted) {
            await saveOTRecord(user.uid, m, dateStr, perDay, bonusGiven, checkInTime, checkOutTime);
            countOT += perDay;
            countBonus += bonusGiven;
          }
        }
      }

      const bonusStr = countBonus > 0 ? ` (+${countBonus}h thưởng)` : "";
      showToast("success", `✅ ${countIn} lên ca, ${countOut} xuống ca${countOT > 0 ? `, +${countOT}h TC${bonusStr}` : ""}`);
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
  }, [checkedIn, checkedOut, members, dateStr, shiftCfg, shiftSchedules, perDayMap, bonusCfg, user]);

  const selectedCount = members.filter(m => checkedIn[m.id] || checkedOut[m.id]).length;

  return (
    <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition text-left"
      >
        <Zap className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex-1">
          Chấm công nhanh
        </span>
        <span className="text-[10px] text-blue-400 mr-1">{selectedCount}/{members.length} NV</span>
        {open ? <ChevronUp className="w-4 h-4 text-blue-400" /> : <ChevronDown className="w-4 h-4 text-blue-400" />}
      </button>

      {open && (
        <div className="bg-white dark:bg-gray-900 px-3 py-3 space-y-3">
          {/* Tất cả */}
          <div className="flex gap-2">
            <button onClick={toggleAllIn} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition ${allCheckedIn ? "bg-green-500 border-green-500 text-white" : "border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50"}`}>
              <LogIn className="w-3.5 h-3.5" /> Tất cả lên ca
            </button>
            <button onClick={toggleAllOut} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition ${allCheckedOut ? "bg-red-500 border-red-500 text-white" : "border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50"}`}>
              <LogOut className="w-3.5 h-3.5" /> Tất cả xuống ca
            </button>
          </div>

          {/* Danh sách */}
          <div className="space-y-1.5">
            {members.map(m => {
              const { isNight, rec, checkInTime, checkOutTime, officialEndStr, perDay, bonusGiven } = getMemberInfo(m);
              const alreadyIn = !!rec?.lenCa;
              const alreadyOut = !!rec?.xuongCa;
              const existingOT = Number(rec?.tangCaHomNay || 0);

              const iconMatch = ICONS.find(ic => ic.name === m.avatar);
              const MemberIcon = iconMatch ? iconMatch.icon : User;
              const memberColor = m.color || (isNight ? "#6366f1" : "#f59e0b");

              return (
                <div key={m.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50">
                  {/* Avatar icon */}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: memberColor + "25" }}>
                    <MemberIcon className="w-3.5 h-3.5" style={{ color: memberColor }} />
                  </div>

                  {/* Tên + preview */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{m.realName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {(checkedIn[m.id] || alreadyIn) && (
                        <span className="text-[9px] text-green-600 flex items-center gap-0.5">
                          <LogIn className="w-2.5 h-2.5" />{alreadyIn ? rec.lenCa : checkInTime}
                        </span>
                      )}
                      {(checkedOut[m.id] || alreadyOut) && (
                        <span className="text-[9px] text-red-500 flex items-center gap-0.5">
                          <LogOut className="w-2.5 h-2.5" />{alreadyOut ? rec.xuongCa : (checkOutTime || "--")}
                        </span>
                      )}
                      {existingOT > 0 && (
                        <span className="text-[9px] font-bold text-orange-500">+{existingOT}h TC ✓</span>
                      )}
                      {checkedOut[m.id] && perDay && !existingOT && (
                        <span className="text-[9px] font-bold text-orange-400">
                          → +{perDay}h TC{bonusGiven > 0 ? ` +${bonusGiven}h thưởng` : ""} (sau {officialEndStr})
                        </span>
                      )}
                      {checkedOut[m.id] && !perDay && !existingOT && (
                        <span className="text-[9px] text-gray-400">→ chưa cấu hình TC</span>
                      )}
                    </div>
                  </div>

                  {/* Nút lên ca */}
                  <button
                    onClick={() => setCheckedIn(p => ({ ...p, [m.id]: !p[m.id] }))}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                      checkedIn[m.id] ? "bg-green-500 border-green-500 text-white"
                      : alreadyIn ? "bg-green-50 border-green-300 text-green-500"
                      : "border-gray-300 dark:border-gray-600 text-gray-300 hover:border-green-400"
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                  </button>

                  {/* Nút xuống ca */}
                  <button
                    onClick={() => setCheckedOut(p => ({ ...p, [m.id]: !p[m.id] }))}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                      checkedOut[m.id] ? "bg-red-500 border-red-500 text-white"
                      : alreadyOut ? "bg-red-50 border-red-300 text-red-400"
                      : "border-gray-300 dark:border-gray-600 text-gray-300 hover:border-red-400"
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Lưu */}
          {selectedCount > 0 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving
                ? <span className="animate-pulse">Đang lưu...</span>
                : <><CheckCircle2 className="w-4 h-4" /> Lưu chấm công ({selectedCount} NV)</>
              }
            </button>
          )}

          <p className="text-[9px] text-gray-400 text-center">
            Check-out = tan ca HC + giờ TC config · Thưởng tự động theo cấu hình
          </p>
        </div>
      )}
    </div>
  );
}
