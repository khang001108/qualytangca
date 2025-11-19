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
import { db } from "../../lib/firebase"; // sửa đường dẫn nếu cần

import {
  LEAVE_CODES,
  LEAVE_MAP,
  normalizeName as normalizeFromHelpers,
} from "./parseHelpers"; // chỉnh path nếu khác

// ==================== Helpers nội bộ (fallback nếu helper file khác) ====================
const normalizeName = (s) => {
  if (!s) return "";
  if (typeof normalizeFromHelpers === "function")
    return normalizeFromHelpers(s);
  return String(s).trim();
};

function timeToMinutes(t) {
  if (!t) return null;
  const s = String(t).trim();
  const [hh, mm] = s.split(":").map((n) => Number(n || 0));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return (hh % 24) * 60 + (mm % 60);
}

function minutesToHHMM(min) {
  min = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function minutesToFlooredHours(min) {
  if (min <= 0) return 0;
  return Math.floor(min / 60);
}

const safeStr = (v, def = null) => (v == null ? def : v);

// ==================== Hook ====================
export default function useOvertimeParser({
  user,
  members = [],
  setMembers = () => { },
  setItems = () => { },
  selectedMonth,
  selectedYear,
  selectedDate,
}) {
  const isProcessing = useRef(false);

  async function loadShiftConfig() {
    try {
      const daySnap = await getDoc(doc(db, "shiftConfig", "day"));
      const nightSnap = await getDoc(doc(db, "shiftConfig", "night"));
      const day = daySnap.exists() ? daySnap.data() : null;
      const night = nightSnap.exists() ? nightSnap.data() : null;
      return { day, night };
    } catch (err) {
      console.error("Error loading shiftConfig", err);
      return { day: null, night: null };
    }
  }

  async function loadBonusAndLimits() {
    const bonusSnap = await getDoc(doc(db, "bonusConfig", "main"));
    const bonus = bonusSnap.exists() ? bonusSnap.data() : {};
    const limitsSnap = await getDocs(collection(db, "overtimeLimits"));
    const limits = {};
    limitsSnap.forEach((d) => {
      const data = d.data();
      limits[String(data.limit || data.monthlyLimit || 0)] = {
        id: d.id,
        ...data,
      };
    });
    return { bonus, limits };
  }

  async function upsertShiftSchedule(dateStr, member, patch) {
    const docId = `${dateStr}__${member.id}`;
    const ref = doc(db, "shiftSchedules", docId);
    const now = serverTimestamp();
    await setDoc(
      ref,
      {
        userId: user?.uid,
        date: dateStr,
        memberId: member.id,
        realName: member.realName,
        nickname: member.nickname || "",
        shift: member.shift || "",
        shiftStart: member.shiftStart || "",
        updatedAt: now,
        ...patch,
      },
      { merge: true }
    );
  }

  async function getShiftSchedule(dateStr, memberId) {
    try {
      const docId = `${dateStr}__${memberId}`;
      const ref = doc(db, "shiftSchedules", docId);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.warn("getShiftSchedule error", e);
      return null;
    }
  }

  async function updateMemberOvertimeWorked(memberId, addHours) {
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
    return { newWorked, newRemaining, monthlyLimit };
  }

  async function updateOvertimeLimitsMember(limitKey, memberId, patch) {
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
        gioThuongConLai: patch.gioThuongConLai || 0,
        gioThuongDaNhan: patch.gioThuongDaNhan || 0,
        soNgayDaLam: patch.soNgayDaLam || 0,
        ngayConLai: patch.ngayConLai || 0,
      });
    } else {
      const m = membersArr[idx];
      membersArr[idx] = {
        ...m,
        ...patch,
      };
    }

    await setDoc(ref, { members: membersArr }, { merge: true });
  }

  function findMemberByName(inputName) {
    const norm = normalizeName(inputName);
    return members.find((m) => {
      if (!m) return false;
      const r = normalizeName(m.realName || "");
      const n = normalizeName(m.nickname || "");
      if (!r && !n) return false;
      if (r === norm) return true;
      if (n === norm) return true;
      if (r && r.includes(norm)) return true;
      if (n && n.includes(norm)) return true;
      return false;
    });
  }

  // ================= main parser =================
  async function parseText(rawText, mode = "checkin") {
    if (isProcessing.current) {
      console.warn("Parser busy");
      return;
    }
    isProcessing.current = true;

    try {
      if (!user?.uid) throw new Error("Chưa đăng nhập");
      if (!rawText || !rawText.trim()) throw new Error("Dữ liệu rỗng");

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
        const member = findMemberByName(namePart);
        if (!member) {
          skipped++;
          continue;
        }

        if (LEAVE_CODES.includes(timePart) || LEAVE_CODES.includes(namePart)) {
          await upsertShiftSchedule(dateStr, member, { note: timePart });
          skipped++;
          continue;
        }

        const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) {
          skipped++;
          continue;
        }
        const hh = Number(timeMatch[1]);
        const mm = Number(timeMatch[2]);
        const minutesOfDay = (hh % 24) * 60 + (mm % 60);

        const shiftStart = member.shiftStart || member.shift || "";
        let isNight = false;

        if (member.shift === "Ca đêm") {
          isNight = true;
        } else if (member.shift === "Ca ngày") {
          isNight = false;
        } else {
          const startMin = timeToMinutes(member.shiftStart);
          if (startMin !== null) {
            isNight = (startMin >= 18 || startMin < 6);
          }
        }
        const cfg = isNight ? shiftNight || {} : shiftDay || {};

        const lenSomStartStr = safeStr(cfg.lenCaSomBatDau, null);
        const lenSomEndStr = safeStr(cfg.lenCaSomKetThuc, null);
        const lenMuonStartStr = safeStr(cfg.lenCaMuonBatDau, null);
        const lenMuonEndStr = safeStr(cfg.lenCaMuonKetThuc, null);
        const tanSomStartStr = safeStr(cfg.tanCaSomBatDau, null);
        const tanMuonStartStr = safeStr(cfg.tanCaMuonBatDau, null);

        const lenSomStart = timeToMinutes(lenSomStartStr);
        const lenSomEnd = timeToMinutes(lenSomEndStr);
        const lenMuonStart = timeToMinutes(lenMuonStartStr);
        const lenMuonEnd = timeToMinutes(lenMuonEndStr);
        const tanSomStart = timeToMinutes(tanSomStartStr);
        const tanMuonStart = timeToMinutes(tanMuonStartStr);

        // ---------- CHECKIN ----------
        if (mode === "checkin") {
          let checkinType = "other";

          if (typeof lenSomStart === "number" && typeof lenSomEnd === "number") {
            if (lenSomStart <= lenSomEnd) {
              if (minutesOfDay >= lenSomStart && minutesOfDay <= lenSomEnd) {
                checkinType = "som";
              }
            } else {
              if (minutesOfDay >= lenSomStart || minutesOfDay <= lenSomEnd) {
                checkinType = "som";
              }
            }
          }

          if (checkinType === "other" && typeof lenMuonStart === "number" && typeof lenMuonEnd === "number") {
            if (lenMuonStart <= lenMuonEnd) {
              if (minutesOfDay >= lenMuonStart && minutesOfDay <= lenMuonEnd) {
                checkinType = "muon";
              }
            } else {
              if (minutesOfDay >= lenMuonStart || minutesOfDay <= lenMuonEnd) {
                checkinType = "muon";
              }
            }
          }

          await upsertShiftSchedule(dateStr, member, {
            lenCa: minutesToHHMM(minutesOfDay),
            checkinType,
          });
          updated++;
          continue;
        }

        // ---------- CHECKOUT ----------
        // Retrieve stored shift schedule first (to get checkinType or lenCa)
        const shiftRec = await getShiftSchedule(dateStr, member.id);

        // Save xuongCa (once)
        await upsertShiftSchedule(dateStr, member, {
          xuongCa: minutesToHHMM(minutesOfDay),
        });
        updated++;

        // Determine checkinType: prefer stored checkinType; else infer from stored lenCa; else fallback to other
        let storedCheckinType = (shiftRec && shiftRec.checkinType) || null;
        if (!storedCheckinType && shiftRec && shiftRec.lenCa) {
          const lenCaMin = timeToMinutes(shiftRec.lenCa);
          if (typeof lenSomStart === "number" && typeof lenSomEnd === "number") {
            if (lenSomStart <= lenSomEnd) {
              if (lenCaMin >= lenSomStart && lenCaMin <= lenSomEnd) storedCheckinType = "som";
            } else {
              if (lenCaMin >= lenSomStart || lenCaMin <= lenSomEnd) storedCheckinType = "som";
            }
          }
          if (!storedCheckinType && typeof lenMuonStart === "number" && typeof lenMuonEnd === "number") {
            if (lenMuonStart <= lenMuonEnd) {
              if (lenCaMin >= lenMuonStart && lenCaMin <= lenMuonEnd) storedCheckinType = "muon";
            } else {
              if (lenCaMin >= lenMuonStart || lenCaMin <= lenMuonEnd) storedCheckinType = "muon";
            }
          }
        }

        const checkinType = storedCheckinType || "other";

        // official boundaries based on checkinType
        let officialStart = null;
        let officialEnd = null;

        if (checkinType === "som") {
          officialStart = timeToMinutes(lenSomEndStr);
          officialEnd = timeToMinutes(tanSomStartStr);
        } else if (checkinType === "muon") {
          officialStart = timeToMinutes(lenMuonEndStr);
          officialEnd = timeToMinutes(tanMuonStartStr);
        } else {
          officialStart = timeToMinutes(lenSomEndStr) || startMin || null;
          officialEnd = timeToMinutes(tanSomStartStr) || (startMin != null ? (startMin + (cfg.tongGioHanhChinh || 8) * 60) % (24 * 60) : null);
        }

        if (officialStart == null || officialEnd == null) {
          continue;
        }

        // compute working duration (hc) - handle wrap
        let hcMin = officialEnd - officialStart;
        if (hcMin < 0) hcMin += 24 * 60;

        hcMin -= (Number(cfg.nghiGiuaCa || 1) * 60);
        if (hcMin < 0) hcMin = 0;
        const gioHanhChinh = hcMin / 60;

        // OT = checkout - officialEnd (wrap)
        let diffMin = minutesOfDay - officialEnd;
        if (diffMin < 0) diffMin += 24 * 60;

        if (diffMin < 60) {
          continue;
        }

        const otHours = minutesToFlooredHours(diffMin);
        if (otHours <= 0) continue;

        const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
        const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
        const memberRemaining = Math.max(memberLimit - memberWorked, 0);

        const addHours = memberLimit > 0 ? Math.min(otHours, memberRemaining) : otHours;

        if (addHours > 0) {
          await updateMemberOvertimeWorked(member.id, addHours);
          totalAddedHours += addHours;

          // bonus calculation
          let bonusGiven = 0;
          try {
            const limitKey = String(memberLimit || 0);
            const limitDoc = limits[limitKey];
            const bonusEnabled = Boolean(bonus?.batThuongTangCa);
            const bonusEvery = Number(bonus?.thuongSauBaoNhieuTieng || 0);
            const bonusAmount = Number(bonus?.congThemBaoNhieuGio || 0);
            const selectedLimits = bonus?.cacNhanhDuocThuong || [];

            const customNoBonus = (bonus?.cacMaKhongThuong || []).concat(LEAVE_CODES || []);
            const nameNormalized = normalizeName(member.realName || "");

            const isNoBonus =
              customNoBonus.includes(nameNormalized) ||
              customNoBonus.includes(member.realName) ||
              customNoBonus.includes(member.nickname);

            const isLimitBranchSelected =
              selectedLimits && selectedLimits.includes(limitKey);

            if (
              bonusEnabled &&
              !isNoBonus &&
              isLimitBranchSelected &&
              bonusEvery > 0 &&
              bonusAmount > 0
            ) {
              const bonusUnits = Math.floor(addHours / bonusEvery);
              bonusGiven = bonusUnits * bonusAmount;

              if (limitDoc && Array.isArray(limitDoc.members)) {
                const memberInLimit = (limitDoc.members || []).find(
                  (mm) => String(mm.id) === String(member.id)
                );
                if (memberInLimit) {
                  const remainBonus =
                    (memberInLimit.gioThuongConLai ||
                      memberInLimit.tongGioThuong ||
                      0) - (memberInLimit.gioThuongDaNhan || 0);
                  if (remainBonus <= 0) bonusGiven = 0;
                  else bonusGiven = Math.min(bonusGiven, remainBonus);
                }
              }
            }
          } catch (e) {
            console.warn("Bonus calc failed", e);
            bonusGiven = 0;
          }

          totalBonusAdded += bonusGiven;

          // update overtimeLimits member entry with otCounted logic
          try {
            if (memberLimit && memberLimit > 0) {
              const limitDocRef = doc(db, "overtimeLimits", `limit_${memberLimit}`);
              const limitSnap = await getDoc(limitDocRef);
              if (limitSnap.exists()) {
                const limitData = limitSnap.data();
                const membersArr = Array.isArray(limitData.members) ? limitData.members : [];
                const idx = membersArr.findIndex((mm) => String(mm.id) === String(member.id));
                const existing = idx !== -1 ? membersArr[idx] : {};

                const existedGioDaLam = Number(existing.gioDaLam || existing.worked || 0);
                const existedSoNgay = Number(existing.soNgayDaLam || 0);
                const existedGioThuongDaNhan = Number(existing.gioThuongDaNhan || 0);
                const existedGioThuongConLai = Number(existing.gioThuongConLai || existing.tongGioThuong || 0);

                // determine if this day already counted for OT
                const alreadyCounted = !!(shiftRec && shiftRec.otCounted);

                const newGioDaLam = existedGioDaLam + addHours;
                const incrementDay = alreadyCounted ? 0 : 1;
                const newSoNgay = existedSoNgay + incrementDay;

                const totalPlan = Number(existing.tongGioKeHoach || limitData.limit || 0);
                const newGioConLai = Math.max(totalPlan - newGioDaLam, 0);

                const newGioThuongDaNhan = existedGioThuongDaNhan + (bonusGiven || 0);
                const newGioThuongConLai = Math.max(existedGioThuongConLai - (bonusGiven || 0), 0);

                const existedNgayConLai = Number(existing.ngayConLai ?? limitData.days ?? 0);
                const newNgayConLai = Math.max(existedNgayConLai - incrementDay, 0);

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

                // mark otCounted on shiftSchedules so same-day re-runs don't double count
                if (!alreadyCounted) {
                  await upsertShiftSchedule(dateStr, member, { otCounted: true });
                }
              }
            }
          } catch (e) {
            console.warn("Failed updating overtimeLimits member", e);
          }

          // write overtime record
          try {
            const otRef = doc(collection(db, "overtimes"));
            await setDoc(otRef, {
              userId: user.uid,
              memberId: member.id,
              realName: member.realName,
              nickname: member.nickname || "",
              date: dateStr,

              // giờ
              checkIn: shiftRec?.lenCa || null,
              checkOut: minutesToHHMM(minutesOfDay),

              // tăng ca & thưởng
              tangCaHomNay: addHours,
              thuong: bonusGiven,

              addedHours: addHours,
              bonusGiven: bonusGiven,

              shift: member.shift || "",
              createdAt: serverTimestamp(),
            });
          } catch (e) {
            console.warn("Failed writing overtime record", e);
          }
        } // end addHours > 0
      } // end for lines

      return {
        added,
        updated,
        skipped,
        totalAddedHours,
        totalBonusAdded,
      };
    } catch (err) {
      console.error("parseText error", err);
      throw err;
    } finally {
      isProcessing.current = false;
    }
  } // end parseText

  return { parseText };
}
