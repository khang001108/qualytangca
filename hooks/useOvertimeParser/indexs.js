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
import { db } from "../../lib/firebase"; // chỉnh path nếu cần

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
  setMembers = () => {},
  setItems = () => {},
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
        // không tự động ghi đè shift/shiftStart ở đây để tránh ghi đè nguồn phân ca
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

    const idx = membersArr.findIndex(
      (mm) => String(mm.id) === String(memberId)
    );
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

        // handle leave codes either as whole timePart or namePart
        if (LEAVE_CODES.includes(timePart) || LEAVE_CODES.includes(namePart)) {
          await upsertShiftSchedule(dateStr, member, { note: timePart });
          skipped++;
          continue;
        }

        // Extract time and trailing text (supports "11:01 4h事假")
        const timeMatch = timePart.match(/\b(\d{1,2}):(\d{2})\b/);
        if (!timeMatch) {
          skipped++;
          continue;
        }
        const extractedTime = timeMatch[0];
        const remainingText = timePart.replace(extractedTime, "").trim();

        // parse hh:mm from extractedTime
        const hh = Number(extractedTime.split(":")[0]);
        const mm = Number(extractedTime.split(":")[1]);

        // 07:54
        // (hh % 24) * 60  → 7 * 60  = 420 phút
        // (mm % 60)       → 54      = 54 phút
        // -----------------------------------------
        // minutesOfDay = 420 + 54 = 474 phút trong ngày
        let minutesOfDay = (hh % 24) * 60 + (mm % 60);

        // If remainingText indicates a leave, store note and skip OT logic
        if (
          remainingText &&
          LEAVE_CODES.some((c) => remainingText.includes(c))
        ) {
          // write lenCa or xuongCa depending on mode
          if (mode === "checkin") {
            await upsertShiftSchedule(dateStr, member, {
              lenCa: minutesToHHMM(minutesOfDay),
              note: remainingText,
            });
          } else {
            await upsertShiftSchedule(dateStr, member, {
              xuongCa: minutesToHHMM(minutesOfDay),
              note: remainingText,
            });
          }
          skipped++;
          continue;
        }

        // ====================== FIX XÁC ĐỊNH CA NGÀY / CA ĐÊM BẰNG KHUNG GIỜ ======================
        let isNight = false;

        // Chuyển tất cả khung giờ sang phút
        const d_somStart = timeToMinutes(shiftDay?.lenCaSomBatDau);
        const d_somEnd = timeToMinutes(shiftDay?.lenCaSomKetThuc);
        const d_muonStart = timeToMinutes(shiftDay?.lenCaMuonBatDau);
        const d_muonEnd = timeToMinutes(shiftDay?.lenCaMuonKetThuc);

        const n_somStart = timeToMinutes(shiftNight?.lenCaSomBatDau);
        const n_somEnd = timeToMinutes(shiftNight?.lenCaSomKetThuc);
        const n_muonStart = timeToMinutes(shiftNight?.lenCaMuonBatDau);
        const n_muonEnd = timeToMinutes(shiftNight?.lenCaMuonKetThuc);

        // Hàm kiểm tra nằm trong khoảng
        const inRange = (t, a, b) => a <= t && t <= b;

        // 1) Kiểm tra CA NGÀY trước
        if (
          inRange(minutesOfDay, d_somStart, d_somEnd) ||
          inRange(minutesOfDay, d_muonStart, d_muonEnd)
        ) {
          isNight = false;
        }
        // 2) Kiểm tra CA ĐÊM
        else if (
          inRange(minutesOfDay, n_somStart, n_somEnd) ||
          inRange(minutesOfDay, n_muonStart, n_muonEnd)
        ) {
          isNight = true;
        }
        // 3) fallback nếu không khớp khung nào
        else {
          // nếu không thuộc cả 2 ca → dùng shift nếu có
          if (member.shift === "Ca đêm") isNight = true;
          else isNight = false; // an toàn, mặc định ca ngày
        }

        const cfg = isNight ? shiftNight || {} : shiftDay || {};

        // load window strings from cfg
        const lenSomStartStr = safeStr(cfg.lenCaSomBatDau, null);
        const lenSomEndStr = safeStr(cfg.lenCaSomKetThuc, null);
        const lenMuonStartStr = safeStr(cfg.lenCaMuonBatDau, null);
        const lenMuonEndStr = safeStr(cfg.lenCaMuonKetThuc, null);
        const tanSomStartStr = safeStr(cfg.tanCaSomBatDau, null);
        const tanMuonStartStr = safeStr(cfg.tanCaMuonBatDau, null);

        // convert to minutes where possible
        const lenSomStart = timeToMinutes(lenSomStartStr);
        const lenSomEnd = timeToMinutes(lenSomEndStr);
        const lenMuonStart = timeToMinutes(lenMuonStartStr);
        const lenMuonEnd = timeToMinutes(lenMuonEndStr);
        const tanSomStart = timeToMinutes(tanSomStartStr);
        const tanMuonStart = timeToMinutes(tanMuonStartStr);

        // ---------- CHECKIN ----------
        if (mode === "checkin") {
          // determine checkinType for record (but DO NOT use it to choose official boundaries)
          let checkinType = "other";

          if (
            typeof lenSomStart === "number" &&
            typeof lenSomEnd === "number"
          ) {
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

          if (
            checkinType === "other" &&
            typeof lenMuonStart === "number" &&
            typeof lenMuonEnd === "number"
          ) {
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
          if (
            typeof lenSomStart === "number" &&
            typeof lenSomEnd === "number"
          ) {
            if (lenSomStart <= lenSomEnd) {
              if (lenCaMin >= lenSomStart && lenCaMin <= lenSomEnd)
                storedCheckinType = "som";
            } else {
              if (lenCaMin >= lenSomStart || lenCaMin <= lenSomEnd)
                storedCheckinType = "som";
            }
          }
          if (
            !storedCheckinType &&
            typeof lenMuonStart === "number" &&
            typeof lenMuonEnd === "number"
          ) {
            if (lenMuonStart <= lenMuonEnd) {
              if (lenCaMin >= lenMuonStart && lenCaMin <= lenMuonEnd)
                storedCheckinType = "muon";
            } else {
              if (lenCaMin >= lenMuonStart || lenCaMin <= lenMuonEnd)
                storedCheckinType = "muon";
            }
          }
        }

        const checkinType = storedCheckinType || "other";

        // ========= CHỌN officialStart / officialEnd THEO CÔNG THỨC CŨ ==========
        // Không dùng member.shiftStart nữa vì nó sai dữ liệu (day bị lưu thành night)

        let officialStart = null;
        let officialEnd = null;

        if (!isNight) {
          // CA NGÀY (KHÔNG WRAP QUA HÔM SAU)
          if (checkinType === "som") {
            officialStart = timeToMinutes(cfg.lenCaSomKetThuc); // 07:00
            officialEnd = timeToMinutes(cfg.tanCaSomBatDau); // 16:00
          } else {
            officialStart = timeToMinutes(cfg.lenCaMuonKetThuc); // 08:00
            officialEnd = timeToMinutes(cfg.tanCaMuonBatDau); // 17:00
          }
        } else {
          // CA ĐÊM (CÓ WRAP)
          if (checkinType === "som") {
            officialStart = timeToMinutes(cfg.lenCaSomKetThuc); // 19:00
            officialEnd = timeToMinutes(cfg.tanCaSomBatDau); // 04:00
          } else {
            officialStart = timeToMinutes(cfg.lenCaMuonKetThuc); // 20:00
            officialEnd = timeToMinutes(cfg.tanCaMuonBatDau); // 05:00
          }
        }

        // If cannot determine official times -> skip
        if (officialStart == null || officialEnd == null) {
          continue;
        }

        // Adjust for wrap-around (overnight shifts where end < start)
        let checkoutMin = minutesOfDay;
        if (officialEnd < officialStart) {
          officialEnd += 24 * 60; // move end to next day minutes
          if (checkoutMin < officialStart) checkoutMin += 24 * 60;
        }

        // compute working duration (hc) if needed - preserved logic
        let hcMin = officialEnd - officialStart;
        if (hcMin < 0) hcMin += 24 * 60; // just in case
        hcMin -= Number(cfg.nghiGiuaCa || 1) * 60;
        if (hcMin < 0) hcMin = 0;
        const gioHanhChinh = hcMin / 60;

        // OT = checkout - officialEnd (wrap handled)
        let diffMin = checkoutMin - officialEnd;
        if (diffMin < 60) {
          // less than 1 hour -> not counted as OT
          continue;
        }

        const otHours = minutesToFlooredHours(diffMin);
        if (otHours <= 0) continue;

        const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
        const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
        const memberRemaining = Math.max(memberLimit - memberWorked, 0);

        const addHours =
          memberLimit > 0 ? Math.min(otHours, memberRemaining) : otHours;

        if (addHours > 0) {
          // Update member worked hours
          await updateMemberOvertimeWorked(member.id, addHours);
          totalAddedHours += addHours;

          // bonus calculation (preserve original logic)
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

                // determine if this day already counted for OT
                const alreadyCounted = !!(shiftRec && shiftRec.otCounted);

                const newGioDaLam = existedGioDaLam + addHours;
                const incrementDay = alreadyCounted ? 0 : 1;
                const newSoNgay = existedSoNgay + incrementDay;

                const totalPlan = Number(
                  existing.tongGioKeHoach || limitData.limit || 0
                );
                const newGioConLai = Math.max(totalPlan - newGioDaLam, 0);

                const newGioThuongDaNhan =
                  existedGioThuongDaNhan + (bonusGiven || 0);
                const newGioThuongConLai = Math.max(
                  existedGioThuongConLai - (bonusGiven || 0),
                  0
                );

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
                  gioThuongDaNhan: newGioThuongDaNhan,
                  gioThuongConLai: newGioThuongConLai,
                };

                await updateOvertimeLimitsMember(memberLimit, member.id, patch);

                // mark otCounted on shiftSchedules so same-day re-runs don't double count
                if (!alreadyCounted) {
                  await upsertShiftSchedule(dateStr, member, {
                    otCounted: true,
                  });
                }
              }
            }
          } catch (e) {
            console.warn("Failed updating overtimeLimits member", e);
          }

          // write overtime record (preserve original behavior)
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
