// hooks/useOvertimeParser/index.js
import { useRef } from "react";
import dayjs from "dayjs";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

import {
  LEAVE_CODES,
  normalizeName as normalizeFromHelpers,
} from "./parseHelpers"; // chỉnh path nếu cần

// helpers nội bộ
const normalizeName = (s) =>
  typeof normalizeFromHelpers === "function" ? normalizeFromHelpers(s) : String(s || "").trim();

const timeToMinutes = (t) => {
  if (!t) return null;
  const s = String(t).trim();
  const [hRaw, mRaw] = s.split(":").map((v) => Number(v || 0));
  return (hRaw % 24) * 60 + (mRaw % 60);
};
const minutesToHHMM = (min) => {
  const hh = Math.floor((min % (24 * 60)) / 60);
  const mm = Math.floor(min % 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
const floorHoursFromMinutes = (min) => (min <= 0 ? 0 : Math.floor(min / 60));

// upsert shiftSchedules doc
async function upsertShiftSchedule(dateStr, member, patch) {
  const docId = `${dateStr}__${member.id}`;
  const ref = doc(db, "shiftSchedules", docId);
  await setDoc(
    ref,
    {
      userId: member.userId || member.userId || "",
      date: dateStr,
      memberId: member.id,
      realName: member.realName,
      nickname: member.nickname || "",
      shift: member.shift || "",
      shiftStart: member.shiftStart || "",
      updatedAt: serverTimestamp(),
      ...patch,
    },
    { merge: true }
  );
}

// update members overtime worked
async function updateMemberOvertimeWorked(memberId, addHours, setMembers) {
  if (!memberId || !addHours) return null;
  const ref = doc(db, "members", memberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const m = snap.data();
  const oldWorked = Number(m.overtimeLimit?.workedHours || 0);
  const monthlyLimit = Number(m.overtimeLimit?.monthlyLimit || 0);
  const newWorked = oldWorked + addHours;
  const newRemaining = Math.max(monthlyLimit - newWorked, 0);
  await updateDoc(ref, {
    "overtimeLimit.workedHours": newWorked,
    "overtimeLimit.remaining": newRemaining,
    updatedAt: serverTimestamp(),
  });
  if (typeof setMembers === "function") {
    setMembers((prev) =>
      prev.map((x) =>
        x.id === memberId
          ? {
              ...x,
              overtimeLimit: {
                ...(x.overtimeLimit || {}),
                workedHours: newWorked,
                remaining: newRemaining,
                monthlyLimit,
              },
            }
          : x
      )
    );
  }
  return { newWorked, newRemaining, monthlyLimit };
}

// update member entry inside overtimeLimits doc
async function updateOvertimeLimitsMember(limitKey, memberId, patch) {
  if (!limitKey) return;
  const docId = `limit_${limitKey}`;
  const ref = doc(db, "overtimeLimits", docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const membersArr = Array.isArray(data.members) ? data.members : [];
  const idx = membersArr.findIndex((mm) => String(mm.id) === String(memberId));
  if (idx === -1) {
    membersArr.push({
      id: memberId,
      ten: patch.ten || "",
      gioDaLam: patch.gioDaLam || 0,
      gioConLai: patch.gioConLai || 0,
      soNgayDaLam: patch.soNgayDaLam || 0,
      ngayConLai: patch.ngayConLai || 0,
      gioThuongDaNhan: patch.gioThuongDaNhan || 0,
      gioThuongConLai: patch.gioThuongConLai || 0,
    });
  } else {
    membersArr[idx] = { ...membersArr[idx], ...patch };
  }
  await setDoc(ref, { members: membersArr }, { merge: true });
}

// load shift config (day/night)
async function loadShiftConfig() {
  try {
    const daySnap = await getDoc(doc(db, "shiftConfig", "day"));
    const nightSnap = await getDoc(doc(db, "shiftConfig", "night"));
    return {
      day: daySnap.exists() ? daySnap.data() : null,
      night: nightSnap.exists() ? nightSnap.data() : null,
    };
  } catch (e) {
    console.error("loadShiftConfig error", e);
    return { day: null, night: null };
  }
}

// load bonus + overtimeLimits
async function loadBonusAndLimits() {
  const bonusSnap = await getDoc(doc(db, "bonusConfig", "main"));
  const bonus = bonusSnap.exists() ? bonusSnap.data() : {};
  const limitsSnap = await getDocs(collection(db, "overtimeLimits"));
  const limits = {};
  limitsSnap.forEach((d) => {
    const data = d.data();
    limits[String(data.limit || data.monthlyLimit || 0)] = { id: d.id, ...data };
  });
  return { bonus, limits };
}

// find member by name heuristic
function findMemberByName(members, input) {
  const norm = normalizeName(input);
  return members.find((m) => {
    if (!m) return false;
    const rn = normalizeName(m.realName || "");
    const nn = normalizeName(m.nickname || "");
    if (rn === norm || nn === norm) return true;
    if (rn.includes(norm) || nn.includes(norm)) return true;
    return false;
  });
}

// main hook
export default function useOvertimeParser({
  user,
  members = [],
  setMembers = () => {},
  setItems = () => {},
  selectedMonth,
  selectedYear,
  selectedDate,
}) {
  const isProcessing = useRef(false);

  async function parseText(rawText, mode = "checkin") {
    if (isProcessing.current) return;
    isProcessing.current = true;

    try {
      if (!user?.uid) throw new Error("User not logged in");
      if (!rawText || !rawText.trim()) throw new Error("Empty input");

      const { day: shiftDay, night: shiftNight } = await loadShiftConfig();
      const { bonus, limits } = await loadBonusAndLimits();

      const safeDate = selectedDate ? dayjs(selectedDate) : dayjs();
      const dateStr = safeDate.format("YYYY-MM-DD");

      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      let added = 0,
        updated = 0,
        skipped = 0,
        totalAddedHours = 0,
        totalBonusAdded = 0;

      for (let raw of lines) {
        const parts = raw.split("/");
        if (parts.length < 2) {
          skipped++;
          continue;
        }
        const namePart = parts[0].replace(/^\d+\.\s*/, "").trim();
        const timePart = parts[1].trim();

        // leave handling
        if (LEAVE_CODES && LEAVE_CODES.includes(timePart)) {
          // mark note leave
          const memberLeave = findMemberByName(members, namePart);
          if (memberLeave) {
            await upsertShiftSchedule(dateStr, memberLeave, { note: timePart });
            updated++;
          } else skipped++;
          continue;
        }

        const member = findMemberByName(members, namePart);
        if (!member) {
          skipped++;
          continue;
        }

        const tm = timePart.match(/^(\d{1,2}):(\d{2})$/);
        if (!tm) {
          skipped++;
          continue;
        }
        const hh = Number(tm[1]);
        const mm = Number(tm[2]);
        const minutesOfDay = (hh % 24) * 60 + (mm % 60);

        // determine shift type (based on member.shiftStart if present)
        const memberShiftStartMin = timeToMinutes(member.shiftStart || "");
        const isNight = memberShiftStartMin !== null && (memberShiftStartMin >= 18 || memberShiftStartMin < 6);
        const cfg = isNight ? shiftNight || {} : shiftDay || {};

        // collect windows from cfg with fallbacks
        const lenSomStart = timeToMinutes(cfg.lenCaSomBatDau) ?? timeToMinutes(cfg.lenCaMuonBatDau);
        const lenSomEnd = timeToMinutes(cfg.lenCaSomKetThuc) ?? timeToMinutes(cfg.lenCaMuonKetThuc);
        const lenMuonStart = timeToMinutes(cfg.lenCaMuonBatDau);
        const lenMuonEnd = timeToMinutes(cfg.lenCaMuonKetThuc);

        const tanSomStart = timeToMinutes(cfg.tanCaSomBatDau);
        const tanSomEnd = timeToMinutes(cfg.tanCaSomKetThuc);
        const tanMuonStart = timeToMinutes(cfg.tanCaMuonBatDau);
        const tanMuonEnd = timeToMinutes(cfg.tanCaMuonKetThuc);

        // --------------------------------
        // MODE: checkin
        // Reject if not inside lenSom OR lenMuon window (no late checkin)
        // --------------------------------
        if (mode === "checkin") {
          let ok = false;
          // early window
          if (typeof lenSomStart === "number" && typeof lenSomEnd === "number") {
            if (lenSomStart <= lenSomEnd) {
              if (minutesOfDay >= lenSomStart && minutesOfDay <= lenSomEnd) ok = true;
            } else {
              if (minutesOfDay >= lenSomStart || minutesOfDay <= (lenSomEnd % (24*60))) ok = true;
            }
          }
          // late window
          if (!ok && typeof lenMuonStart === "number" && typeof lenMuonEnd === "number") {
            if (lenMuonStart <= lenMuonEnd) {
              if (minutesOfDay >= lenMuonStart && minutesOfDay <= lenMuonEnd) ok = true;
            } else {
              if (minutesOfDay >= lenMuonStart || minutesOfDay <= (lenMuonEnd % (24*60))) ok = true;
            }
          }

          if (!ok) {
            // mark invalid checkin — do NOT award action; still save with note
            await upsertShiftSchedule(dateStr, member, {
              lenCa: minutesToHHMM(minutesOfDay),
              note: "invalid-checkin",
            });
            updated++;
            continue; // do not treat as valid checkin for 8h
          }

          // valid -> save lenCa
          await upsertShiftSchedule(dateStr, member, { lenCa: minutesToHHMM(minutesOfDay) });
          updated++;
          continue;
        }

        // --------------------------------
        // MODE: checkout
        // Reject early checkout: if before tanSomStart (for som) or before tanMuonStart (for muon) -> invalid
        // Determine whether checkout is som or muon region by closeness to respective windows
        // --------------------------------
        // Decide which tan window to use: prefer tanSom if minutes within som range; else tanMuon if within; else choose based on isNight and member.shiftStart
        let usedTanStart = null;
        let usedTanEnd = null;
        let usedType = null; // 'som' or 'muon'
        // if within som window
        if (typeof tanSomStart === "number" && typeof tanSomEnd === "number") {
          if (tanSomStart <= tanSomEnd) {
            if (minutesOfDay >= tanSomStart && minutesOfDay <= tanSomEnd) {
              usedTanStart = tanSomStart;
              usedTanEnd = tanSomEnd;
              usedType = "som";
            }
          } else {
            if (minutesOfDay >= tanSomStart || minutesOfDay <= (tanSomEnd % (24*60))) {
              usedTanStart = tanSomStart;
              usedTanEnd = tanSomEnd;
              usedType = "som";
            }
          }
        }
        // else if within muon window
        if (!usedType && typeof tanMuonStart === "number" && typeof tanMuonEnd === "number") {
          if (tanMuonStart <= tanMuonEnd) {
            if (minutesOfDay >= tanMuonStart && minutesOfDay <= tanMuonEnd) {
              usedTanStart = tanMuonStart;
              usedTanEnd = tanMuonEnd;
              usedType = "muon";
            }
          } else {
            if (minutesOfDay >= tanMuonStart || minutesOfDay <= (tanMuonEnd % (24*60))) {
              usedTanStart = tanMuonStart;
              usedTanEnd = tanMuonEnd;
              usedType = "muon";
            }
          }
        }

        // If not in any tan window, decide usedType by member expected (isNight) and fallback
        if (!usedType) {
          // If member is night -> assume muon (end at 05:00), else som (end at 04:00)
          usedType = isNight ? "muon" : "som";
          usedTanStart = usedType === "muon" ? tanMuonStart : tanSomStart;
          usedTanEnd = usedType === "muon" ? tanMuonEnd : tanSomEnd;
        }

        // Validate: if checkout is BEFORE tan window start -> invalid (no early checkout)
        if (typeof usedTanStart === "number") {
          // handle wrap
          const before =
            usedTanStart <= minutesOfDay ? false : true; // if minutesOfDay < usedTanStart then before
          if (minutesOfDay < usedTanStart) {
            // early checkout -> invalid
            await upsertShiftSchedule(dateStr, member, {
              xuongCa: minutesToHHMM(minutesOfDay),
              note: "invalid-checkout",
            });
            updated++;
            continue; // do not compute OT or mark 8h
          }
        }

        // Save xuongCa
        await upsertShiftSchedule(dateStr, member, { xuongCa: minutesToHHMM(minutesOfDay) });
        updated++;

        // Now check if both lenCa and xuongCa exist for this day and are valid (not marked invalid)
        const ssDocId = `${dateStr}__${member.id}`;
        const ssSnap = await getDoc(doc(db, "shiftSchedules", ssDocId));
        const ssData = ssSnap.exists() ? ssSnap.data() : {};
        // if either note contains invalid or lenCa/xuongCa missing -> skip awarding 8h or OT
        if (!ssData.lenCa || !ssData.xuongCa) {
          // do nothing, require both ends
          continue;
        }
        if (ssData.note && (ssData.note === "invalid-checkin" || ssData.note === "invalid-checkout")) {
          continue;
        }

        // At this point we have valid checkin & checkout -> award 8h office (no change stored; UI reads presence to display)
        // Compute OT: determine OT reference mốc depending on usedType:
        const otReferenceMin = usedType === "muon" ? (tanMuonStart ?? (timeToMinutes(member.shiftStart || "00:00") + 8*60)) : (tanSomStart ?? (timeToMinutes(member.shiftStart || "00:00") + 8*60));
        if (typeof otReferenceMin !== "number") continue;

        let diffMin = minutesOfDay - otReferenceMin;
        if (diffMin < 0) diffMin += 24 * 60; // wrap
        if (diffMin < 60) {
          // less than 1 hour OT -> no OT
          continue;
        }

        const otHours = floorHoursFromMinutes(diffMin); // floor
        // apply member limit
        const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
        const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
        const memberRemaining = Math.max(memberLimit - memberWorked, 0);
        const addHours = Math.min(otHours, memberRemaining);
        if (addHours <= 0) continue;

        // update member worked
        await updateMemberOvertimeWorked(member.id, addHours, setMembers);
        totalAddedHours += addHours;

        // BONUS calculation
        let bonusGiven = 0;
        try {
          const limitKey = String(memberLimit || 0);
          const limitDoc = limits[limitKey];
          const bonusEnabled = Boolean(bonus?.batThuongTangCa);
          const bonusEvery = Number(bonus?.thuongSauBaoNhieuTieng || 0);
          const bonusAmount = Number(bonus?.congThemBaoNhieuGio || 0);
          const selectedLimits = bonus?.cacNhanhDuocThuong || [];
          const customNoBonus = (bonus?.cacMaKhongThuong || []).concat(LEAVE_CODES || []);
          const norm = normalizeName(member.realName || "");

          const isNoBonus = customNoBonus.includes(norm) || customNoBonus.includes(member.realName) || customNoBonus.includes(member.nickname);
          const isBranchSelected = selectedLimits.includes(limitKey);

          if (bonusEnabled && !isNoBonus && isBranchSelected && bonusEvery > 0 && bonusAmount > 0) {
            if (otHours >= bonusEvery) {
              const units = Math.floor(otHours / bonusEvery);
              bonusGiven = units * bonusAmount;
              // cap by remaining in limitDoc if available
              if (limitDoc && Array.isArray(limitDoc.members)) {
                const mInLimit = (limitDoc.members || []).find((mm) => String(mm.id) === String(member.id));
                if (mInLimit) {
                  const remainBonus = (mInLimit.gioThuongConLai || mInLimit.tongGioThuong || 0) - (mInLimit.gioThuongDaNhan || 0);
                  if (remainBonus <= 0) bonusGiven = 0;
                  else bonusGiven = Math.min(bonusGiven, remainBonus);
                }
              }
            }
          }
        } catch (e) {
          console.warn("bonus calc error", e);
          bonusGiven = 0;
        }
        totalBonusAdded += bonusGiven;

        // update overtimeLimits member entry
        try {
          if (memberLimit && memberLimit > 0) {
            // fetch doc and compute fields
            const lRef = doc(db, "overtimeLimits", `limit_${memberLimit}`);
            const lSnap = await getDoc(lRef);
            if (lSnap.exists()) {
              const lData = lSnap.data();
              const existing = (lData.members || []).find((mm) => String(mm.id) === String(member.id)) || {};
              const existedGioDaLam = Number(existing.gioDaLam || existing.worked || 0);
              const existedSoNgay = Number(existing.soNgayDaLam || 0);
              const existedGioThuongDaNhan = Number(existing.gioThuongDaNhan || 0);
              const existedGioThuongConLai = Number(existing.gioThuongConLai || existing.tongGioThuong || 0);

              const newGioDaLam = existedGioDaLam + addHours;
              const newSoNgay = existedSoNgay + 1;
              const totalPlan = Number(existing.tongGioKeHoach || lData.limit || 0);
              const newGioConLai = Math.max(totalPlan - newGioDaLam, 0);
              const newGioThuongDaNhan = existedGioThuongDaNhan + (bonusGiven || 0);
              const newGioThuongConLai = Math.max(existedGioThuongConLai - (bonusGiven || 0), 0);
              const newNgayConLai = Math.max(Number(existing.ngayConLai || lData.days || 0) - 1, 0);

              const patch = {
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
          console.warn("update overtimeLimits failed", e);
        }

        // write history record to 'overtimes'
        try {
          const recRef = doc(collection(db, "overtimes"));
          await setDoc(recRef, {
            userId: user.uid,
            memberId: member.id,
            realName: member.realName,
            nickname: member.nickname || "",
            date: dateStr,
            checkIn: ssData.lenCa || null,
            checkOut: ssData.xuongCa || minutesToHHMM(minutesOfDay),
            addedHours: addHours,
            bonusGiven: totalBonusAdded || 0,
            shift: member.shift || "",
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn("write overtime history failed", e);
        }
      } // end loop lines

      return { added, updated, skipped, totalAddedHours, totalBonusAdded };
    } catch (err) {
      console.error("parseText error", err);
      throw err;
    } finally {
      isProcessing.current = false;
    }
  }

  return { parseText };
}
