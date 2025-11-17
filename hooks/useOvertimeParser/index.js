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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { LEAVE_CODES, normalizeName as normalizeFromHelpers } from "./parseHelpers";

// ---------------------- HELPERS ----------------------
const normalizeName = (s) =>
  typeof normalizeFromHelpers === "function" ? normalizeFromHelpers(s) : String(s || "").trim();

function timeStrToMinutes(t) {
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]) % 24;
  const mm = Number(m[2]) % 60;
  return hh * 60 + mm;
}
function minutesToHHMM(min) {
  min = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function floorMinutesToHours(min) {
  return min >= 60 ? Math.floor(min / 60) : 0;
}
const inWindow = (min, a, b) => {
  if (a == null || b == null) return false;
  if (a <= b) return min >= a && min <= b;
  return min >= a || min <= b % 1440; // wrap midnight

};

// ---------------------- LOAD CONFIG ----------------------
async function loadShiftConfig() {
  try {
    const d = await getDoc(doc(db, "shiftConfig", "day"));
    const n = await getDoc(doc(db, "shiftConfig", "night"));
    return {
      day: d.exists() ? d.data() : {},
      night: n.exists() ? n.data() : {},
    };
  } catch (e) {
    console.warn("loadShiftConfig error", e);
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
    const key = String(data.limit ?? data.monthlyLimit ?? "");
    if (key) limits[key] = { id: d.id, ...data };
  });

  return { bonus, limits };
}

// ---------------------- FIRESTORE OPS ----------------------
async function upsertShiftSchedule(userId, dateStr, member, patch) {
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
}

async function fetchShiftSchedule(dateStr, memberId) {
  const id = `${dateStr}__${memberId}`;
  const ref = doc(db, "shiftSchedules", id);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

async function updateMemberOT(memberId, addHours) {
  if (!memberId || !addHours) return null;
  const ref = doc(db, "members", memberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data();
  const oldWorked = Number(data.overtimeLimit?.workedHours || 0);
  const limit = Number(data.overtimeLimit?.monthlyLimit || 0);
  const newWorked = oldWorked + addHours;
  const newRemain = Math.max(limit - newWorked, 0);

  await updateDoc(ref, {
    "overtimeLimit.workedHours": newWorked,
    "overtimeLimit.remaining": newRemain,
    updatedAt: serverTimestamp(),
  });

  return { newWorked, newRemain, limit };
}

async function updateLimitDoc(limitKey, memberId, patch) {
  if (!limitKey) return;
  const ref = doc(db, "overtimeLimits", `limit_${limitKey}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const members = Array.isArray(data.members) ? data.members : [];

  const idx = members.findIndex((m) => String(m.id) === String(memberId));
  if (idx === -1) members.push({ id: memberId, ...patch });
  else members[idx] = { ...members[idx], ...patch };

  await setDoc(ref, { members }, { merge: true });
}

// ---------------------- MAIN HOOK ----------------------
export default function useOvertimeParser({ user, members = [], selectedDate }) {
  const isProcessing = useRef(false);

  // helper to find member by various names
  const findMemberByName = (input) => {
    const n = normalizeName(input);
    return members.find((m) => {
      if (!m) return false;
      const r = normalizeName(m.realName || "");
      const k = normalizeName(m.nickname || "");
      if (r === n || k === n) return true;
      if ((r && r.includes(n)) || (k && k.includes(n))) return true;
      return false;
    });
  };

  async function parseText(rawText, mode = "checkin") {
    if (isProcessing.current) return { error: "busy" };
    isProcessing.current = true;

    try {
      if (!user?.uid) throw new Error("Not logged in");

      const dateStr = (selectedDate ? dayjs(selectedDate) : dayjs()).format("YYYY-MM-DD");
      const { day: cfgDay, night: cfgNight } = await loadShiftConfig();
      const { bonus: bonusCfg, limits: limitsMap } = await loadBonusAndLimits();

      const lines = String(rawText || "").split("\n").map((l) => l.trim()).filter(Boolean);

      let updated = 0, skipped = 0;
      let totalAddedHours = 0, totalBonusGiven = 0;

      for (const raw of lines) {
        const parts = raw.split("/");
        if (parts.length < 2) { skipped++; continue; }

        const nameRaw = parts[0].replace(/^\d+\.\s*/, "").trim();
        const timeRaw = parts[1].trim();

        // validate time format or leave codes
        if (!/^\d{1,2}:\d{2}$/.test(timeRaw) && !LEAVE_CODES.includes(timeRaw)) { skipped++; continue; }

        const member = findMemberByName(nameRaw);
        if (!member) { skipped++; continue; }

        // handle leave codes
        if (LEAVE_CODES.includes(timeRaw) || LEAVE_CODES.includes(nameRaw)) {
          await upsertShiftSchedule(user.uid, dateStr, member, { note: timeRaw });
          updated++;
          continue;
        }

        const minutes = timeStrToMinutes(timeRaw);
        if (minutes == null) { skipped++; continue; }

        // load existing shiftSchedules for this member+date (to get shift if already set and existing len/xuong)
        const existingSS = await fetchShiftSchedule(dateStr, member.id);

        // determine shift for that date: prefer shiftSchedules.shift, fallback to member.shift / member.shiftStart heuristic
        const shiftName = (existingSS && existingSS.shift) ? existingSS.shift : (member.shift || "");
        let cfg = cfgDay;
        // if shiftName explicitly contains 'đêm' or 'Ca đêm' or equals 'night' we choose night; else day
        const isNightShiftBySS = typeof shiftName === "string" && /đêm|dem|night/i.test(shiftName);
        if (isNightShiftBySS) cfg = cfgNight;
        else {
          // fallback: if member.shiftStart suggests night, use night
          const startMin = timeStrToMinutes(member.shiftStart || "");
          if (startMin != null && (startMin >= 18 * 60 || startMin < 6 * 60)) cfg = cfgNight;
          else cfg = cfgDay;
        }

        // extract windows from cfg (use null-safe)
        const lenSomStart = timeStrToMinutes(cfg.lenCaSomBatDau);
        const lenSomEnd = timeStrToMinutes(cfg.lenCaSomKetThuc);
        const lenMuonStart = timeStrToMinutes(cfg.lenCaMuonBatDau);
        const lenMuonEnd = timeStrToMinutes(cfg.lenCaMuonKetThuc);

        const tanSomStart = timeStrToMinutes(cfg.tanCaSomBatDau);
        const tanSomEnd = timeStrToMinutes(cfg.tanCaSomKetThuc);
        const tanMuonStart = timeStrToMinutes(cfg.tanCaMuonBatDau);
        const tanMuonEnd = timeStrToMinutes(cfg.tanCaMuonKetThuc);

        // determine checkinType (based on cfg windows)
        let checkinType = null;
        if (inWindow(minutes, lenSomStart, lenSomEnd)) checkinType = "som";
        else if (inWindow(minutes, lenMuonStart, lenMuonEnd)) checkinType = "muon";

        // ------------------ MODE: checkin ------------------
        if (mode === "checkin") {
          if (!checkinType) {
            // invalid checkin -> save note (and still record lenCa for UI debugging)
            await upsertShiftSchedule(user.uid, dateStr, member, {
              lenCa: minutesToHHMM(minutes),
              note: "invalid-checkin",
            });
          } else {
            // valid checkin -> save lenCa and clear invalid note if previously set
            const patch = { lenCa: minutesToHHMM(minutes) };
            // if previously note invalid-checkout or invalid-checkin, keep notes? we overwrite only invalid-checkin
            await upsertShiftSchedule(user.uid, dateStr, member, patch);
          }
          updated++;
          continue;
        }

        // ------------------ MODE: checkout ------------------
        // determine checkoutType using tan windows
        let checkoutType = null;
        if (inWindow(minutes, tanSomStart, tanSomEnd)) checkoutType = "som";
        else if (inWindow(minutes, tanMuonStart, tanMuonEnd)) checkoutType = "muon";

        if (!checkoutType) {
          // invalid checkout
          await upsertShiftSchedule(user.uid, dateStr, member, {
            xuongCa: minutesToHHMM(minutes),
            note: "invalid-checkout",
          });
          updated++;
          continue;
        }

        // valid checkout -> save xuongCa
        await upsertShiftSchedule(user.uid, dateStr, member, { xuongCa: minutesToHHMM(minutes) });
        updated++;

        // after saving, re-fetch shiftSchedules to validate pair
        const ss = await fetchShiftSchedule(dateStr, member.id);
        if (!ss) continue;

        // If lenCa missing or marked invalid -> do not compute OT/bonus
        if (!ss.lenCa) continue;
        if (ss.note === "invalid-checkin" || ss.note === "invalid-checkout") continue;

        // determine lenCa minutes & xuongCa minutes reliably
        const lenCaMin = timeStrToMinutes(ss.lenCa);
        const xuongCaMin = timeStrToMinutes(ss.xuongCa || minutesToHHMM(minutes));
        if (lenCaMin == null || xuongCaMin == null) continue;

        // compute duration between lenCa -> xuongCa (handle wrap)
        let duration = xuongCaMin - lenCaMin;
        if (duration < 0) duration += 1440;

        const officeH = Number(cfg.tongGioHanhChinh ?? 8);
        if (duration < officeH * 60) {
          // Not enough official hours -> do not award bonus.
          // Still allow OT calculation if checkout beyond OT reference? specification requires "must be đủ 8h to get bonus".
          // We'll still compute OT but will not give bonus. (If you prefer no OT at all when <8h, change here.)
        }

        // Determine OT reference mốc based on checkinType (the day's lenCa)
        // Use the checkinType based on stored lenCa in this day's cfg windows
        let usedCheckinType = null;
        if (inWindow(lenCaMin, lenSomStart, lenSomEnd)) usedCheckinType = "som";
        else if (inWindow(lenCaMin, lenMuonStart, lenMuonEnd)) usedCheckinType = "muon";
        else usedCheckinType = null;

        if (!usedCheckinType) continue; // checkin invalid or outside windows — safety

        // OT mốc
        const otRefMin = usedCheckinType === "som" ? tanSomStart : tanMuonStart;
        if (typeof otRefMin !== "number") continue;

        // compute OT minutes
        let diff = xuongCaMin - otRefMin;
        if (diff < 0) diff += 1440;
        if (diff < 60) continue; // less than 1h -> no OT

        const otHours = floorMinutesToHours(diff);
        if (otHours <= 0) continue;

        // member limit & remaining
        const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
        const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
        const memberRemain = Math.max(memberLimit - memberWorked, 0);
        const addHours = memberLimit > 0 ? Math.min(otHours, memberRemain) : otHours;
        if (addHours <= 0) continue;

        // update member document workedHours
        const updateRes = await updateMemberOT(member.id, addHours);
        totalAddedHours += addHours;

        // -------- BONUS calculation (only if duration >= officeH*60) --------
        let bonusGiven = 0;
        try {
          const limitKey = String(memberLimit || 0);
          const limitDoc = limitsMap[limitKey];
          const enabled = Boolean(bonusCfg?.batThuongTangCa || bonusCfg?.bonusEnabled);
          const bonusEvery = Number(bonusCfg?.thuongSauBaoNhieuTieng || 0);
          const bonusAmount = Number(bonusCfg?.congThemBaoNhieuGio || 0);
          const selected = Array.isArray(bonusCfg?.cacNhanhDuocThuong) ? bonusCfg.cacNhanhDuocThuong : [];
          const excluded = Array.isArray(bonusCfg?.cacMaKhongThuong) ? bonusCfg.cacMaKhongThuong : [];

          const nameNorm = normalizeName(member.realName || "");

          const isExcluded = excluded.includes(nameNorm) || excluded.includes(member.realName) || excluded.includes(member.nickname);
          const isSelectedBranch = selected.includes(limitKey);

          if (enabled && !isExcluded && isSelectedBranch && duration >= (officeH * 60) && bonusEvery > 0 && bonusAmount > 0) {
            const units = Math.floor(otHours / bonusEvery);
            bonusGiven = units * bonusAmount;
            // cap by remaining in limitDoc if exists
            if (limitDoc && Array.isArray(limitDoc.members)) {
              const ent = limitDoc.members.find((x) => String(x.id) === String(member.id));
              if (ent) {
                const remainBonus = Number(ent.gioThuongConLai || ent.tongGioThuong || 0) - Number(ent.gioThuongDaNhan || 0);
                bonusGiven = Math.max(0, Math.min(bonusGiven, remainBonus));
              }
            }
          }
        } catch (e) {
          console.warn("bonus calc error", e);
          bonusGiven = 0;
        }
        totalBonusGiven += bonusGiven;

        // -------- UPDATE overtimeLimits doc (with lastUpdatedDate to avoid double counting soNgayDaLam) --------
        if (memberLimit > 0) {
          const limitKey = String(memberLimit);
          const ldoc = limitsMap[limitKey];
          if (ldoc) {
            const existing = (ldoc.members || []).find((x) => String(x.id) === String(member.id)) || {};
            const lastDate = existing.lastUpdatedDate || null;
            const incrementDay = lastDate !== dateStr ? 1 : 0;

            const newGioDaLam = Number(existing.gioDaLam || 0) + addHours;
            const newSoNgay = Number(existing.soNgayDaLam || 0) + incrementDay;
            const plan = Number(ldoc.limit || ldoc.monthlyLimit || memberLimit);
            const newGioConLai = Math.max(plan - newGioDaLam, 0);
            const newGioThuongDaNhan = Number(existing.gioThuongDaNhan || 0) + bonusGiven;
            const newGioThuongConLai = Math.max(Number(existing.gioThuongConLai || existing.tongGioThuong || 0) - bonusGiven, 0);
            const newNgayConLai = Math.max(Number(existing.ngayConLai || ldoc.days || 0) - incrementDay, 0);

            await updateLimitDoc(limitKey, member.id, {
              id: member.id,
              ten: member.nickname || member.realName,
              gioDaLam: newGioDaLam,
              gioConLai: newGioConLai,
              soNgayDaLam: newSoNgay,
              ngayConLai: newNgayConLai,
              gioThuongDaNhan: newGioThuongDaNhan,
              gioThuongConLai: newGioThuongConLai,
              lastUpdatedDate: dateStr, // prevent double-count same day
            });
          }
        }

        // -------- write overtime history --------
        try {
          await setDoc(doc(collection(db, "overtimes")), {
            userId: user.uid,
            memberId: member.id,
            realName: member.realName,
            nickname: member.nickname || "",
            date: dateStr,
            checkIn: ss.lenCa || null,
            checkOut: ss.xuongCa || minutesToHHMM(minutes),
            addedHours: addHours,
            bonusGiven,
            shift: ss.shift || member.shift || "",
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn("write overtime history failed", e);
        }
      } // end for lines

      return { updated, skipped, totalAddedHours, totalBonusGiven };
    } catch (err) {
      console.error("parseText error", err);
      throw err;
    } finally {
      isProcessing.current = false;
    }
  }

  return { parseText };
}
