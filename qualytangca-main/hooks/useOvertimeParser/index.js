// hooks/useOvertimeParser/index.js
// Rewritten parser: ngắn, rõ, chuẩn — xử lý đúng ca ngày/đêm, wrap ca đêm, tránh double-count,
// tôn trọng phân ca đã lưu (shiftSchedules), bảo toàn logic bonus & limits.
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
} from "./parseHelpers";

// --------------------------- Helpers ---------------------------
const normalizeName = (s) => {
  if (!s) return "";
  if (typeof normalizeFromHelpers === "function")
    return normalizeFromHelpers(s);
  return String(s).trim();
};

const safeStr = (v, def = null) => (v == null ? def : v);

function timeToMinutes(t) {
  if (!t) return null;
  const s = String(t).trim();
  const [hh, mm] = s.split(":").map((n) => Number(n || 0));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return (hh % 24) * 60 + (mm % 60);
}

function minutesToHHMM(min) {
  if (min == null) return null;
  min = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function minutesToFlooredHours(min) {
  if (!Number.isFinite(min) || min <= 0) return 0;
  return Math.floor(min / 60);
}

// inclusive range, supports wrap-around if end < start (e.g., 20:00 -> 04:00)
function inRangeWrap(val, start, end) {
  if (start == null || end == null || val == null) return false;
  if (start <= end) return val >= start && val <= end;
  // wrap
  return val >= start || val <= end;
}

// ---------------------- Firestore helpers (small & safe) ----------------------
async function loadShiftConfig() {
  try {
    const daySnap = await getDoc(doc(db, "shiftConfig", "day"));
    const nightSnap = await getDoc(doc(db, "shiftConfig", "night"));
    return {
      day: daySnap.exists() ? daySnap.data() : null,
      night: nightSnap.exists() ? nightSnap.data() : null,
    };
  } catch (e) {
    console.warn("loadShiftConfig failed", e);
    return { day: null, night: null };
  }
}

async function loadBonusAndLimits() {
  try {
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
  } catch (e) {
    console.warn("loadBonusAndLimits failed", e);
    return { bonus: {}, limits: {} };
  }
}

async function upsertShiftSchedule(dateStr, member, patch) {
  const docId = `${dateStr}__${member.id}`;
  const ref = doc(db, "shiftSchedules", docId);
  const now = serverTimestamp();
  await setDoc(
    ref,
    {
      userId: member.userId || null,
      date: dateStr,
      memberId: member.id,
      realName: member.realName,
      nickname: member.nickname || "",
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
  return { newWorked, newRemaining, monthlyLimit };
}

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
      gioThuongConLai: patch.gioThuongConLai || 0,
      gioThuongDaNhan: patch.gioThuongDaNhan || 0,
      soNgayDaLam: patch.soNgayDaLam || 0,
      ngayConLai: patch.ngayConLai || 0,
    });
  } else {
    membersArr[idx] = { ...membersArr[idx], ...patch };
  }
  await setDoc(ref, { members: membersArr }, { merge: true });
}

// --------------------------- Main Hook ---------------------------
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

  async function parseText(rawText, mode = "checkin", editedTimes = {}) {
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

      // precompute day/night windows (minutes)
      const dayWindows = {
        som: {
          checkin: timeToMinutes(shiftDay?.lenCaSomBatDau),
          checkinEnd: timeToMinutes(shiftDay?.lenCaSomKetThuc),
        },
        muon: {
          checkin: timeToMinutes(shiftDay?.lenCaMuonBatDau),
          checkinEnd: timeToMinutes(shiftDay?.lenCaMuonKetThuc),
        },
      };
      const nightWindows = {
        som: {
          checkin: timeToMinutes(shiftNight?.lenCaSomBatDau),
          checkinEnd: timeToMinutes(shiftNight?.lenCaSomKetThuc),
        },
        muon: {
          checkin: timeToMinutes(shiftNight?.lenCaMuonBatDau),
          checkinEnd: timeToMinutes(shiftNight?.lenCaMuonKetThuc),
        },
      };

      for (let raw of lines) {
        const parts = raw.split("/");
        if (parts.length < 2) {
          skipped++;
          continue;
        }

        const namePart = parts[0].replace(/^\d+\.\s*/, "").trim();
        const timePart = parts[1].trim();
        const member = members.find((m) => {
          const r = normalizeName(m.realName || "");
          const n = normalizeName(m.nickname || "");
          if (!r && !n) return false;
          if (r === normalizeName(namePart)) return true;
          if (n === normalizeName(namePart)) return true;
          if (r.includes(normalizeName(namePart))) return true;
          if (n.includes(normalizeName(namePart))) return true;
          return false;
        });
        if (!member) {
          skipped++;
          continue;
        }

        // LEAVE handling: whole token or trailing note
        if (LEAVE_CODES.includes(timePart) || LEAVE_CODES.includes(namePart)) {
          await upsertShiftSchedule(dateStr, member, { note: timePart });
          skipped++;
          continue;
        }

        const timeMatch = timePart.match(/\b(\d{1,2}):(\d{2})\b/);
        if (!timeMatch) {
          skipped++;
          continue;
        }
        const extractedTime = timeMatch[0];
        const trailing = timePart.replace(extractedTime, "").trim();

        // trailing indicating leave -> write lenCa/xuongCa and skip OT logic
        if (trailing && LEAVE_CODES.some((c) => trailing.includes(c))) {
          if (mode === "checkin") {
            await upsertShiftSchedule(dateStr, member, {
              lenCa: extractedTime,
              note: trailing,
            });
          } else {
            await upsertShiftSchedule(dateStr, member, {
              xuongCa: extractedTime,
              note: trailing,
            });
          }
          skipped++;
          continue;
        }

        const hh = Number(extractedTime.split(":")[0]);
        const mm = Number(extractedTime.split(":")[1]);
        let minutesOfDay = (hh % 24) * 60 + (mm % 60);

        // Prefer persisted shiftSchedule for this member/day (authoritative)
        const shiftRec = await getShiftSchedule(dateStr, member.id);
        // thêm dòng này:
        let newShiftRec = shiftRec;

        // Determine isNight:
        // 1) If shiftRec.shift exists -> use it (trust manual assignment).
        // 2) Else if member.shift exists -> use it (member default).
        // 3) Else: infer by checking whether minutesOfDay falls into any day checkin windows (som/muon).
        //    if not in day windows but in night windows -> night.
        //    otherwise fallback to simple rule: [04:00..12:00) => day else night.
        let isNight = false;
        if (shiftRec && shiftRec.shift) {
          isNight = String(shiftRec.shift).toLowerCase().includes("đêm");
        } else if (member.shift) {
          isNight = String(member.shift).toLowerCase().includes("đêm");
        } else {
          // try day windows
          const inDay =
            (typeof dayWindows.som.checkin === "number" &&
              inRangeWrap(
                minutesOfDay,
                dayWindows.som.checkin,
                dayWindows.som.checkinEnd
              )) ||
            (typeof dayWindows.muon.checkin === "number" &&
              inRangeWrap(
                minutesOfDay,
                dayWindows.muon.checkin,
                dayWindows.muon.checkinEnd
              ));

          const inNight =
            (typeof nightWindows.som.checkin === "number" &&
              inRangeWrap(
                minutesOfDay,
                nightWindows.som.checkin,
                nightWindows.som.checkinEnd
              )) ||
            (typeof nightWindows.muon.checkin === "number" &&
              inRangeWrap(
                minutesOfDay,
                nightWindows.muon.checkin,
                nightWindows.muon.checkinEnd
              ));

          if (inDay && !inNight) isNight = false;
          else if (!inDay && inNight) isNight = true;
          else {
            // fallback safe rule
            isNight = !(minutesOfDay >= 4 * 60 && minutesOfDay < 12 * 60);
          }
        }

        // For check-in mode: persist lenCa + checkinType (som/muon/other) and continue
        // Use the chosen shift config (day/night) to decide checkinType
        const cfg = isNight ? shiftNight || {} : shiftDay || {};
        const lenSomStart = timeToMinutes(cfg.lenCaSomBatDau);
        const lenSomEnd = timeToMinutes(cfg.lenCaSomKetThuc);
        const lenMuonStart = timeToMinutes(cfg.lenCaMuonBatDau);
        const lenMuonEnd = timeToMinutes(cfg.lenCaMuonKetThuc);

        if (mode === "checkin") {
          let checkinType = "other";
          if (
            typeof lenSomStart === "number" &&
            typeof lenSomEnd === "number" &&
            inRangeWrap(minutesOfDay, lenSomStart, lenSomEnd)
          ) {
            checkinType = "som";
          } else if (
            typeof lenMuonStart === "number" &&
            typeof lenMuonEnd === "number" &&
            inRangeWrap(minutesOfDay, lenMuonStart, lenMuonEnd)
          ) {
            checkinType = "muon";
          }
          await upsertShiftSchedule(dateStr, member, {
            lenCa: minutesToHHMM(minutesOfDay),
            checkinType,
            type: "work",
            // do not overwrite shift/shiftStart here (we respect manual assignments)
          });
          updated++;
          continue;
        }

        // ---------- checkout ----------
        // persist xuongCa immediately
        await upsertShiftSchedule(dateStr, member, {
          xuongCa: minutesToHHMM(minutesOfDay),
          type: "work",
        });
        updated++;

        // ============================ HANDLE MANUAL EDIT ============================
        // HANDLE MANUAL EDIT
        const manual = editedTimes[member.id];
        if (manual) {
          // 1) nghỉ phép không OT
          if (manual.leaveType && !manual.withOT) {
            await upsertShiftSchedule(dateStr, member, {
              note: manual.leaveType,
              session: manual.session || null,
              manualLeave: true,
              type: "leave",
            });
            continue;
          }

          if (!manual.leaveType) {
            await upsertShiftSchedule(dateStr, member, {
              type: "work",
            });
          }

          // 2) load lại shift sau khi lưu phép
          newShiftRec =
            (await getShiftSchedule(dateStr, member.id)) || shiftRec;

          // 3) OT thủ công
          if (manual.withOT) {
            const addHours = Number(manual.otHours || 0);

            await updateMemberOvertimeWorked(member.id, addHours);

            const otRef = doc(collection(db, "overtimes"));
            await setDoc(otRef, {
              userId: user.uid,
              memberId: member.id,
              realName: member.realName,
              nickname: member.nickname || "",
              date: dateStr,
              checkIn: newShiftRec?.lenCa || null,
              checkOut: null,
              tangCaHomNay: addHours,
              thuong: 0,
              addedHours: addHours,
              bonusGiven: 0,
              shift: newShiftRec?.shift || member.shift || "",
              manualEdit: true,
              manualLeave: !!manual.leaveType,
              session: manual.session || null,
              createdAt: serverTimestamp(),
            });

            continue;
          }
        }

        // Determine checkinType: prefer stored checkinType in shiftRec, else infer from stored lenCa, else "other"
        let storedCheckinType = (shiftRec && shiftRec.checkinType) || null;
        if (!storedCheckinType && shiftRec && shiftRec.lenCa) {
          const lenCaMin = timeToMinutes(shiftRec.lenCa);
          if (
            typeof lenSomStart === "number" &&
            typeof lenSomEnd === "number" &&
            inRangeWrap(lenCaMin, lenSomStart, lenSomEnd)
          ) {
            storedCheckinType = "som";
          } else if (
            typeof lenMuonStart === "number" &&
            typeof lenMuonEnd === "number" &&
            inRangeWrap(lenCaMin, lenMuonStart, lenMuonEnd)
          ) {
            storedCheckinType = "muon";
          }
        }
        const checkinType = storedCheckinType || "other";

        // Build officialStart / officialEnd according to cfg and checkinType.
        // We only read from cfg fields (lenCaSomKetThuc, tanCaSomBatDau, etc).
        // For night shifts officialEnd may be < officialStart (wrap) — handle it.
        let officialStart = null;
        let officialEnd = null;

        if (!isNight) {
          if (checkinType === "som") {
            officialStart = timeToMinutes(cfg.lenCaSomKetThuc); // e.g., 07:00
            officialEnd = timeToMinutes(cfg.tanCaSomBatDau); // e.g., 16:00
          } else if (checkinType === "muon") {
            officialStart = timeToMinutes(cfg.lenCaMuonKetThuc); // e.g., 08:00
            officialEnd = timeToMinutes(cfg.tanCaMuonBatDau); // e.g., 17:00
          } else {
            // fallback: use muon window if available
            officialStart =
              timeToMinutes(cfg.lenCaMuonKetThuc) ??
              timeToMinutes(cfg.lenCaSomKetThuc);
            officialEnd =
              timeToMinutes(cfg.tanCaMuonBatDau) ??
              timeToMinutes(cfg.tanCaSomBatDau);
          }
        } else {
          // night (may wrap)
          if (checkinType === "som") {
            officialStart = timeToMinutes(cfg.lenCaSomKetThuc);
            officialEnd = timeToMinutes(cfg.tanCaSomBatDau);
          } else if (checkinType === "muon") {
            officialStart = timeToMinutes(cfg.lenCaMuonKetThuc);
            officialEnd = timeToMinutes(cfg.tanCaMuonBatDau);
          } else {
            officialStart =
              timeToMinutes(cfg.lenCaMuonKetThuc) ??
              timeToMinutes(cfg.lenCaSomKetThuc);
            officialEnd =
              timeToMinutes(cfg.tanCaMuonBatDau) ??
              timeToMinutes(cfg.tanCaSomBatDau);
          }
        }

        if (officialStart == null || officialEnd == null) {
          // missing config — cannot compute OT safely
          continue;
        }

        // Adjust for wrap-around: if officialEnd < officialStart => end is next day
        let checkoutMin = minutesOfDay;
        let localOfficialEnd = officialEnd;
        if (localOfficialEnd < officialStart) {
          localOfficialEnd += 24 * 60;
          if (checkoutMin < officialStart) checkoutMin += 24 * 60;
        }

        // OT minutes = checkout - officialEnd
        let diffMin = checkoutMin - localOfficialEnd;
        if (diffMin < 60) {
          // less than 1 hour -> not counted
          continue;
        }

        const otHours = minutesToFlooredHours(diffMin);
        if (otHours <= 0) continue;

        // Enforce per-member monthly limit
        const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
        const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
        const memberRemaining = Math.max(memberLimit - memberWorked, 0);

        const addHours =
          memberLimit > 0 ? Math.min(otHours, memberRemaining) : otHours;
        if (addHours <= 0) continue;

        // Prevent double-count: if shiftRec.otCounted is true -> skip adding hours but still may write ot record
        const alreadyCounted = !!(shiftRec && shiftRec.otCounted);

        if (!alreadyCounted) {
          // update member worked hours
          await updateMemberOvertimeWorked(member.id, addHours);
          totalAddedHours += addHours;
        }

        // Bonus calculation (kept same semantics)
        let bonusGiven = 0;
        try {
          const limitKey = String(memberLimit || 0);
          const limitDoc = limits[limitKey];
          const bonusEnabled = Boolean(bonus?.batThuongTangCa);
          const bonusEvery = Number(bonus?.thuongSauBaoNhieuTieng || 0);
          const bonusAmount = Number(bonus?.congThemBaoNhieuGio || 0);
          const selectedLimits = bonus?.cacNhanhDuocThuong || [];

          const customNoBonus = (bonus?.cacMaKhongThuong || []).concat(
            LEAVE_CODES || []
          );
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
            // CÁCH 3 — Thưởng theo số ngày OT thực tế
            const bonusUnits = Math.floor(addHours / bonusEvery);

            // Thưởng theo số ngày OT thực tế
            // bonusGiven = bonusUnits * bonusAmount;
            // Bạn có thể nâng cấp logic để chỉ thưởng 1 lần mỗi ngày (nếu OT >= 2h):
            bonusGiven = addHours >= bonusEvery ? bonusAmount : 0;

            // Nếu muốn thưởng theo từng 2 giờ 1 lần:
            // bonusGiven = Math.floor(addHours / bonusEvery) * bonusAmount;

          }
        } catch (e) {
          console.warn("Bonus calc failed", e);
          bonusGiven = 0;
        }
        totalBonusAdded += bonusGiven;

        // Update overtimeLimits member entry and mark otCounted on shiftSchedules
        try {
          if (memberLimit && memberLimit > 0) {
            const limitDocRef = doc(
              db,
              "overtimeLimits",
              `limit_${memberLimit}`
            );
            const limitSnap = await getDoc(limitDocRef);
            if (limitSnap.exists()) {
              const limitData = limitSnap.data();
              const membersArr = Array.isArray(limitData.members)
                ? limitData.members
                : [];
              const idx = membersArr.findIndex(
                (mm) => String(mm.id) === String(member.id)
              );
              const existing = idx !== -1 ? membersArr[idx] : {};

              const existedGioDaLam = Number(
                existing.gioDaLam || existing.worked || 0
              );
              const existedSoNgay = Number(existing.soNgayDaLam || 0);
              const existedGioThuongDaNhan = Number(
                existing.gioThuongDaNhan || 0
              );
              const existedGioThuongConLai = Number(
                existing.gioThuongConLai || existing.tongGioThuong || 0
              );

              const newGioDaLam =
                existedGioDaLam + (alreadyCounted ? 0 : addHours);
              const incrementDay = alreadyCounted ? 0 : 1;
              const newSoNgay = existedSoNgay + incrementDay;

              const totalPlan = Number(
                existing.tongGioKeHoach || limitData.limit || 0
              );
              const newGioConLai = Math.max(totalPlan - newGioDaLam, 0);

              // const newGioThuongDaNhan =
              //   existedGioThuongDaNhan + (bonusGiven || 0);
              // const newGioThuongConLai = Math.max(
              //   existedGioThuongConLai - (bonusGiven || 0),
              //   0
              // );

              const existedNgayConLai = Number(
                existing.ngayConLai ?? limitData.days ?? 0
              );
              const newNgayConLai = Math.max(
                existedNgayConLai - incrementDay,
                0
              );

              const patch = {
                id: member.id,
                ten: member.nickname || member.realName || "",
                gioDaLam: newGioDaLam,
                gioConLai: newGioConLai,
                soNgayDaLam: newSoNgay,
                ngayConLai: newNgayConLai,
                // gioThuongDaNhan: newGioThuongDaNhan,
                // gioThuongConLai: newGioThuongConLai,
              };

              await updateOvertimeLimitsMember(memberLimit, member.id, patch);

              if (!alreadyCounted) {
                // mark otCounted so reruns don't double count
                await upsertShiftSchedule(dateStr, member, { otCounted: true });
              }
            }
          }
        } catch (e) {
          console.warn("Failed updating overtimeLimits member", e);
        }

        // write overtime record (one per detection)
        try {
          const otRef = doc(collection(db, "overtimes"));
          const finalShift = newShiftRec ||
            shiftRec || { lenCa: null, shift: member.shift || "" };
          await setDoc(otRef, {
            userId: user.uid,
            memberId: member.id,
            realName: member.realName,
            nickname: member.nickname || "",
            date: dateStr,
            checkIn: finalShift.lenCa,
            checkOut: minutesToHHMM(minutesOfDay),
            tangCaHomNay: alreadyCounted ? 0 : addHours,
            thuong: bonusGiven,
            addedHours: alreadyCounted ? 0 : addHours,
            bonusGiven,
            shift: finalShift.shift,
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn("Failed writing overtime record", e);
        }
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
