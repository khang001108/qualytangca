// hooks/useOvertimeParser/index.js
import { useRef } from "react";
import dayjs from "dayjs";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { LEAVE_CODES, normalizeName as normalizeFromHelpers } from "./parseHelpers";

/**
 * useOvertimeParser
 *
 * Args: { user, members, setMembers, selectedDate }
 * Returns: { parseText }
 *
 * Behaviour summary:
 * - parseText(rawText, mode = 'checkin'|'checkout')
 * - For each line "1.姓名/HH:MM" (or "姓名/HH:MM"):
 *    * find member by exact normalized name or nickname (NO includes fallback)
 *    * determine member shiftStart and whether this is night shift (shiftStart >=18 || <6)
 *    * load appropriate shiftConfig (day/night) and windows
 *    * if checkin: if time in len window -> set lenCa
 *    * if checkout: set xuongCa; if checkout beyond tan boundary -> calculate OT minutes -> floor to hours
 *    * respect monthly limit (members.overtimeLimit.monthlyLimit) when adding hours
 *    * update overtimeLimits document `limit_${limitKey}` member entry (gioDaLam, gioConLai, soNgayDaLam, ngayConLai, gioThuongDaNhan, gioThuongConLai)
 *    * compute bonus per bonusConfig and cap to remaining bonus in overtimeLimits if applicable
 *    * write an `overtimes` history doc for audit
 *
 * Notes:
 * - Uses exact normalized equality to match names (safer).
 * - Handles midnight wrap for night shifts.
 * - Floors minutes to whole hours for OT credit.
 */

const normalizeName = (s) => {
  if (!s) return "";
  if (typeof normalizeFromHelpers === "function") return normalizeFromHelpers(s);
  return String(s).trim();
};

function timeStrToMinutes(t) {
  if (!t) return null;
  const s = String(t).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]) % 24;
  const mm = Number(m[2]) % 60;
  return hh * 60 + mm;
}
function minutesToHHMM(min) {
  min = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function floorMinutesToHours(min) {
  if (!min || min < 60) return 0;
  return Math.floor(min / 60);
}

async function loadShiftConfig() {
  try {
    const d = await getDoc(doc(db, "shiftConfig", "day"));
    const n = await getDoc(doc(db, "shiftConfig", "night"));
    return {
      day: d.exists() ? d.data() : {},
      night: n.exists() ? n.data() : {},
    };
  } catch (e) {
    console.warn("loadShiftConfig failed", e);
    return { day: {}, night: {} };
  }
}

async function loadBonusAndLimits() {
  const bonusSnap = await getDoc(doc(db, "bonusConfig", "main"));
  const bonus = bonusSnap.exists() ? bonusSnap.data() : {};
  const limitsSnap = await getDocs(collection(db, "overtimeLimits"));
  const limits = {};
  limitsSnap.forEach((d) => {
    const data = d.data();
    // key by numeric limit (string)
    const key = String(data.limit ?? data.monthlyLimit ?? 0);
    limits[key] = { id: d.id, ...data };
  });
  return { bonus, limits };
}

async function upsertShiftScheduleSimple(userId, dateStr, member, patch) {
  // doc id deterministic: `${date}__${member.id}`
  const id = `${dateStr}__${member.id}`;
  const ref = doc(db, "shiftSchedules", id);
  const base = {
    userId,
    date: dateStr,
    memberId: member.id,
    realName: member.realName,
    nickname: member.nickname || "",
    shift: member.shift || "",
    shiftStart: member.shiftStart || "",
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, { ...base, ...patch }, { merge: true });
  return ref;
}

async function updateMembersOvertimeAtomic(memberId, addHours) {
  if (!memberId || !addHours) return null;
  const ref = doc(db, "members", memberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  const oldWorked = Number(data.overtimeLimit?.workedHours || 0);
  const monthlyLimit = Number(data.overtimeLimit?.monthlyLimit || 0);
  const newWorked = oldWorked + addHours;
  const newRemaining = Math.max(monthlyLimit - newWorked, 0);
  await updateDoc(ref, {
    "overtimeLimit.workedHours": newWorked,
    "overtimeLimit.remaining": newRemaining,
    updatedAt: serverTimestamp(),
  });
  return { newWorked, newRemaining, monthlyLimit };
}

async function updateOvertimeLimitsMember(limitKey, memberId, patch) {
  if (!limitKey) return;
  const docId = `limit_${limitKey}`;
  const ref = doc(db, "overtimeLimits", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // If doc doesn't exist, skip creating new doc here (avoid rác).
    return;
  }
  const data = snap.data();
  const members = Array.isArray(data.members) ? data.members : [];
  const idx = members.findIndex((m) => String(m.id) === String(memberId));
  if (idx === -1) {
    members.push({ id: memberId, ...patch });
  } else {
    members[idx] = { ...members[idx], ...patch };
  }
  await setDoc(ref, { members }, { merge: true });
}

// main hook
export default function useOvertimeParser({ user, members = [], setMembers, selectedDate }) {
  const isProcessing = useRef(false);

  async function parseText(rawText, mode = "checkin") {
    if (isProcessing.current) {
      console.warn("Parser busy");
      return { error: "busy" };
    }
    isProcessing.current = true;

    try {
      if (!user?.uid) throw new Error("Chưa đăng nhập");
      if (!rawText || !rawText.trim()) return { added: 0, updated: 0, skipped: 0 };

      const safeDate = selectedDate ? dayjs(selectedDate) : dayjs();
      const dateStr = safeDate.format("YYYY-MM-DD");

      const { day: shiftDayCfg, night: shiftNightCfg } = await loadShiftConfig();
      const { bonus: bonusCfg, limits: limitsMap } = await loadBonusAndLimits();

      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      let added = 0, updated = 0, skipped = 0;
      let totalAddedHours = 0, totalBonusGiven = 0;

      for (const raw of lines) {
        // parse "1.姓名/HH:MM" or "姓名/HH:MM"
        const parts = raw.split("/");
        if (parts.length < 2) {
          skipped++;
          continue;
        }
        const namePart = parts[0].replace(/^\d+\.\s*/, "").trim();
        const timePart = parts[1].trim();

        // leave codes -> upsert shiftSchedules note and skip
        if (LEAVE_CODES.includes(timePart) || LEAVE_CODES.includes(namePart)) {
          const memberFound = members.find((m) => normalizeName(m.realName) === normalizeName(namePart) || normalizeName(m.nickname) === normalizeName(namePart));
          if (memberFound) {
            await upsertShiftScheduleSimple(user.uid, dateStr, memberFound, { note: timePart });
            updated++;
          } else skipped++;
          continue;
        }

        // time format validation
        const tm = timePart.match(/^(\d{1,2}):(\d{2})$/);
        if (!tm) {
          skipped++;
          continue;
        }
        const hh = Number(tm[1]) % 24;
        const mm = Number(tm[2]) % 60;
        const minutesOfDay = hh * 60 + mm;

        // find member by exact normalized name OR nickname (no includes)
        const norm = normalizeName(namePart);
        const member = members.find((m) => {
          const rn = normalizeName(m.realName || "");
          const nn = normalizeName(m.nickname || "");
          return (rn && rn === norm) || (nn && nn === norm);
        });

        if (!member) {
          skipped++;
          continue;
        }

        // determine shift type by member.shiftStart (string like "19:00")
        const shiftStartStr = member.shiftStart || member.shift || "";
        const startMin = timeStrToMinutes(shiftStartStr);
        const isNight = startMin !== null && (startMin >= 18 || startMin < 6);

        // choose config
        const cfg = isNight ? shiftNightCfg || {} : shiftDayCfg || {};

        // find window boundaries from cfg with safe fallbacks
        const lenStart = timeStrToMinutes(cfg.lenCaSomBatDau || cfg.lenCaMuonBatDau || cfg.gioLenCa || null);
        const lenEnd = timeStrToMinutes(cfg.lenCaSomKetThuc || cfg.lenCaMuonKetThuc || null);
        const tanStart = timeStrToMinutes(cfg.tanCaSomBatDau || cfg.tanCaMuonBatDau || null);
        const tanEnd = timeStrToMinutes(cfg.tanCaSomKetThuc || cfg.tanCaMuonKetThuc || null);

        // helpers for window checks with wrap-midnight support
        const inWindow = (min, a, b) => {
          if (a == null || b == null) return false;
          if (a <= b) return min >= a && min <= b;
          // wrap midnight
          return min >= a || min <= (b % (24 * 60));
        };

        // ------------------ handle checkin ------------------
        if (mode === "checkin") {
          let ok = false;
          if (lenStart != null && lenEnd != null) {
            ok = inWindow(minutesOfDay, lenStart, lenEnd);
          } else {
            // fallback: accept near shift start ±30m
            if (startMin != null) {
              const diff = Math.abs(((minutesOfDay - startMin) + 24*60) % (24*60));
              ok = diff <= 60; // within 1h of shift start
            }
          }

          // write lenCa; mark note if outside window
          const payload = { lenCa: minutesToHHMM(minutesOfDay) };
          if (!ok) payload.note = "checkin-outside-window";
          await upsertShiftScheduleSimple(user.uid, dateStr, member, payload);
          updated++;
          continue;
        }

        // ------------------ handle checkout ------------------
        // save xuongCa first
        await upsertShiftScheduleSimple(user.uid, dateStr, member, { xuongCa: minutesToHHMM(minutesOfDay) });
        updated++;

        // determine reference end-of-shift boundary (tanStart). If absent, approximate by shiftStart + office hours
        let refMin = tanStart;
        if (refMin == null) {
          const officeHours = Number(cfg.tongGioHanhChinh || 8);
          if (startMin != null) {
            refMin = (startMin + officeHours * 60) % (24 * 60);
          }
        }

        if (refMin == null) {
          // cannot determine OT boundary -> skip overtime calc
          continue;
        }

        // compute diff in minutes from refMin to checkout, handling wrap
        let diffMin = minutesOfDay - refMin;
        if (diffMin < 0) diffMin += 24 * 60;

        // only credit OT if >= 60 minutes beyond refMin
        if (diffMin < 60) {
          continue;
        }

        const otHours = floorMinutesToHours(diffMin); // floor to hours
        if (otHours <= 0) continue;

        // check member monthly limit
        const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
        const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
        const memberRemaining = Math.max(memberLimit - memberWorked, 0);

        const addHours = memberLimit > 0 ? Math.min(otHours, memberRemaining) : otHours; // if memberLimit == 0 treat as unlimited (add full)

        if (addHours <= 0) {
          // nothing to add (limit reached)
          continue;
        }

        // 1) update members.overtimeLimit (workedHours & remaining)
        const memberUpdateRes = await updateMembersOvertimeAtomic(member.id, addHours);
        totalAddedHours += addHours;

        // 2) bonus calc
        let bonusGiven = 0;
        try {
          const limitKey = String(memberLimit || 0);
          const limitDoc = limitsMap[limitKey]; // may be undefined
          const bonusEnabled = Boolean(bonusCfg?.batThuongTangCa || bonusCfg?.bonusEnabled);
          const bonusEvery = Number(bonusCfg?.thuongSauBaoNhieuTieng || bonusCfg?.bonusEvery || 0) || 0;
          const bonusAmount = Number(bonusCfg?.congThemBaoNhieuGio || bonusCfg?.bonusAmount || 0) || 0;
          const selectedLimits = bonusCfg?.cacNhanhDuocThuong || [];

          // check exclude codes
          const customNoBonus = (bonusCfg?.cacMaKhongThuong || []).concat(LEAVE_CODES || []);
          const nameNorm = normalizeName(member.realName || "");
          const isNoBonus = customNoBonus.includes(nameNorm) || customNoBonus.includes(member.realName) || customNoBonus.includes(member.nickname);

          const isLimitSelected = selectedLimits && selectedLimits.includes(limitKey);

          if (bonusEnabled && !isNoBonus && isLimitSelected && bonusEvery > 0 && bonusAmount > 0) {
            // example strategy: floor(otHours / bonusEvery) * bonusAmount
            const bonusUnits = Math.floor(addHours / bonusEvery);
            bonusGiven = bonusUnits * bonusAmount;

            // cap to remaining bonus bucket in overtimeLimits if present
            if (limitDoc && Array.isArray(limitDoc.members)) {
              const memberInLimit = (limitDoc.members || []).find((mm) => String(mm.id) === String(member.id));
              if (memberInLimit) {
                const remainBonus = Number(memberInLimit.gioThuongConLai || memberInLimit.tongGioThuong || 0) - Number(memberInLimit.gioThuongDaNhan || 0);
                if (remainBonus <= 0) bonusGiven = 0;
                else bonusGiven = Math.min(bonusGiven, remainBonus);
              }
            }
          }
        } catch (e) {
          console.warn("bonus calc error", e);
          bonusGiven = 0;
        }

        totalBonusGiven += bonusGiven;

        // 3) update overtimeLimits member entry (if exists)
        try {
          const limitKey = String(memberLimit || 0);
          if (memberLimit && memberLimit > 0) {
            // fetch doc snapshot (done inside updateOvertimeLimitsMember)
            // compute patch fields conservatively
            const limitDocId = `limit_${limitKey}`;
            const limitRef = doc(db, "overtimeLimits", limitDocId);
            const limitSnap = await getDoc(limitRef);
            if (limitSnap.exists()) {
              const limitData = limitSnap.data();
              const membersArr = Array.isArray(limitData.members) ? limitData.members : [];
              const existing = membersArr.find((mm) => String(mm.id) === String(member.id)) || {};
              const existedGioDaLam = Number(existing.gioDaLam || existing.worked || 0);
              const existedSoNgay = Number(existing.soNgayDaLam || 0);
              const existedGioThuongDaNhan = Number(existing.gioThuongDaNhan || 0);
              const existedGioThuongConLai = Number(existing.gioThuongConLai || existing.tongGioThuong || 0);

              const newGioDaLam = existedGioDaLam + addHours;
              const newSoNgay = existedSoNgay + 1;
              const totalPlan = Number(existing.tongGioKeHoach || limitData.limit || 0);
              const newGioConLai = Math.max(totalPlan - newGioDaLam, 0);
              const newGioThuongDaNhan = existedGioThuongDaNhan + (bonusGiven || 0);
              const newGioThuongConLai = Math.max(existedGioThuongConLai - (bonusGiven || 0), 0);
              const newNgayConLai = Math.max(Number(existing.ngayConLai || limitData.days || 0) - 1, 0);

              const patch = {
                id: member.id,
                ten: member.nickname || member.realName || "",
                gioDaLam: newGioDaLam,
                gioConLai: newGioConLai,
                soNgayDaLam: newSoNgay,
                ngayConLai: newNgayConLai,
                gioThuongDaNhan: newGioThuongDaNhan,
                gioThuongConLai: newGioThuongConLai,
              };

              await updateOvertimeLimitsMember(memberLimit, member.id, patch);
            }
          }
        } catch (e) {
          console.warn("update overtimeLimits member failed", e);
        }

        // 4) write audit overtime record
        try {
          const otRef = doc(collection(db, "overtimes"));
          await setDoc(otRef, {
            userId: user.uid,
            memberId: member.id,
            realName: member.realName,
            nickname: member.nickname || "",
            date: dateStr,
            checkIn: null,
            checkOut: minutesToHHMM(minutesOfDay),
            addedHours: addHours,
            bonusGiven: bonusGiven || 0,
            shift: member.shift || "",
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn("write overtime history failed", e);
        }
      } // end for lines

      return {
        added,
        updated,
        skipped,
        totalAddedHours,
        totalBonusGiven,
      };
    } catch (err) {
      console.error("parseText error", err);
      throw err;
    } finally {
      isProcessing.current = false;
    }
  }

  return { parseText };
}
