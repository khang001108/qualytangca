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
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase"; // sửa đường dẫn nếu cần

// Nếu bạn có parseHelpers xuất sẵn - dùng nó. Nếu không, file này có fallback nhỏ.
import {
  LEAVE_CODES,
  LEAVE_MAP,
  normalizeName as normalizeFromHelpers,
} from "./parseHelpers"; // chỉnh path nếu khác

// Bonus / limit helpers (bạn đã có file tương tự; nếu không, dùng logic bên dưới)
import { calcOvertimeHoursFloor } from "./calcOvertime"; // nếu có - nếu không comment import và dùng hàm calcMinutesToHours ở dưới

// ==================== Helpers nội bộ (fallback nếu helper file khác) ====================
const normalizeName = (s) => {
  if (!s) return "";
  if (typeof normalizeFromHelpers === "function")
    return normalizeFromHelpers(s);
  return String(s).trim();
};

// Chuyển "hh:mm" thành tổng phút
function timeToMinutes(t) {
  if (!t) return null;
  const s = String(t).trim();
  const [hh, mm] = s.split(":").map((n) => Number(n || 0));
  return hh * 60 + mm;
}

// Chuyển phút thành "HH:MM"
function minutesToHHMM(min) {
  const hh = Math.floor((min % (24 * 60)) / 60);
  const mm = Math.floor(min % 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
// làm tròn: bỏ phút -> floor hours
function minutesToFlooredHours(min) {
  if (min <= 0) return 0;
  return Math.floor(min / 60);
}

// ==================== Hàm chính của hook ====================
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

  // Tải cấu hình ca (day/night)
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

  // Tải bonus config + overtimeLimits doc map
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

  // Lưu hoặc merge shiftSchedules doc (id: `${date}__${member.id}`)
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

  // Cập nhật members.overtimeLimit (atomic-ish)
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

    // update local state (so UI phản hồi nhanh)
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

  // Cập nhật overtimeLimits doc: update member entry inside members[] với cùng logic
  async function updateOvertimeLimitsMember(limitKey, memberId, patch) {
    // limitKey là string/number tương ứng "40"
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
      // nếu không tìm thấy, thêm mới 1 record cơ bản (không phá cấu trúc)
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

  // TÌM member theo tên (thích ứng realName / nickname / includes)
  function findMemberByName(inputName) {
    const norm = normalizeName(inputName);
    return members.find((m) => {
      if (!m) return false;
      const r = normalizeName(m.realName || "");
      const n = normalizeName(m.nickname || "");
      if (!r && !n) return false;
      if (r === norm) return true;
      if (n === norm) return true;
      // fallback contains (nhiều trường hợp tên rút gọn)
      if (r && r.includes(norm)) return true;
      if (n && n.includes(norm)) return true;
      return false;
    });
  }

  // ===================================================================
  // parseText: main entry
  // - rawText: text pasted
  // - mode: "checkin" | "checkout"
  // ===================================================================
  async function parseText(rawText, mode = "checkin") {
    if (isProcessing.current) {
      console.warn("Parser busy");
      return;
    }
    isProcessing.current = true;

    try {
      if (!user?.uid) throw new Error("Chưa đăng nhập");

      if (!rawText || !rawText.trim()) {
        throw new Error("Dữ liệu rỗng");
      }

      const { day: shiftDay, night: shiftNight } = await loadShiftConfig();
      const { bonus, limits } = await loadBonusAndLimits();

      // prepare date string
      const safeDate = selectedDate ? dayjs(selectedDate) : dayjs();
      const dateStr = safeDate.format("YYYY-MM-DD");

      // normalize input lines
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
        // expected format like "1.陈明壯/18:52" or "陈明壯/18:52"
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

        // skip leave codes (no OT / no bonus)
        if (LEAVE_CODES.includes(timePart) || LEAVE_CODES.includes(namePart)) {
          // save note into shiftSchedules (so UI shows leave)
          await upsertShiftSchedule(dateStr, member, { note: timePart });
          skipped++;
          continue;
        }

        // validate time format hh:mm (allow single-digit hour like 4:01 or 04:01)
        const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) {
          skipped++;
          continue;
        }
        const hh = Number(timeMatch[1]);
        const mm = Number(timeMatch[2]);
        const minutesOfDay = (hh % 24) * 60 + (mm % 60);

        // determine which shift (day/night) this member is expected to work
        // use member.shiftStart (e.g., "07:00" or "19:00") to decide
        const shiftStart = member.shiftStart || member.shift || ""; // e.g., "19:00" for night
        const startMin = timeToMinutes(shiftStart);
        const isNight = startMin !== null && (startMin >= 18 || startMin < 6);

        // choose shift config
        const cfg = isNight ? shiftNight || {} : shiftDay || {};

        // get windows: lenCaSomBatDau, lenCaSomKetThuc, tanCaSomBatDau, tanCaSomKetThuc (may be in cfg)
        // different names used across code; try common names
        const lenStart =
          cfg.lenCaSomBatDau ||
          cfg.lenCaMuonBatDau ||
          cfg.gioLenCa ||
          cfg.lenCaSomBatDau;
        const lenEnd =
          cfg.lenCaSomKetThuc ||
          cfg.lenCaMuonKetThuc ||
          cfg.gioLenCa ||
          cfg.lenCaSomKetThuc;
        const tanStart =
          cfg.tanCaSomBatDau ||
          cfg.tanCaMuonBatDau ||
          cfg.gioXuongCa ||
          cfg.tanCaSomBatDau;
        const tanEnd =
          cfg.tanCaSomKetThuc ||
          cfg.tanCaMuonKetThuc ||
          cfg.tanCaSomKetThuc ||
          cfg.tanCaMuonKetThuc;

        // parse minutes for windows (safely)
        const lenStartMin = timeToMinutes(lenStart) ?? startMin - 30; // fallback
        const lenEndMin = timeToMinutes(lenEnd) ?? startMin + 15;
        const tanStartMin = timeToMinutes(tanStart);
        const tanEndMin = timeToMinutes(tanEnd);

        // -----------------------
        // handle checkin (lenCa) or checkout (xuongCa)
        // -----------------------
        if (mode === "checkin") {
          // Accept if time between lenStartMin and lenEndMin (inclusive)
          // For night shifts, times can wrap midnight; but checkin for night should be near startMin
          let ok = false;
          if (lenStartMin <= lenEndMin) {
            ok = minutesOfDay >= lenStartMin && minutesOfDay <= lenEndMin;
          } else {
            // wrap midnight
            ok =
              minutesOfDay >= lenStartMin ||
              minutesOfDay <= lenEndMin % (24 * 60);
          }

          if (!ok) {
            // still write lenCa but mark as outside window? choose to still accept but show toast
            await upsertShiftSchedule(dateStr, member, {
              lenCa: minutesToHHMM(minutesOfDay),
              note: "checkin-outside-window",
            });
          } else {
            await upsertShiftSchedule(dateStr, member, {
              lenCa: minutesToHHMM(minutesOfDay),
            });
          }
          updated++;
        } else {
          // mode === "checkout"
          // Accept if in tan window OR later (OT)
          let ok = false;
          if (
            typeof tanStartMin === "number" &&
            typeof tanEndMin === "number"
          ) {
            if (tanStartMin <= tanEndMin) {
              ok = minutesOfDay >= tanStartMin && minutesOfDay <= tanEndMin;
            } else {
              ok =
                minutesOfDay >= tanStartMin ||
                minutesOfDay <= tanEndMin % (24 * 60);
            }
          } else {
            ok = true; // no tan window -> accept
          }

          // Save xuongCa first
          await upsertShiftSchedule(dateStr, member, {
            xuongCa: minutesToHHMM(minutesOfDay),
          });
          updated++;

          // If checkout is after tanStartMin (i.e., OT), compute OT minutes
          // Need a reference tan boundary: use tanStartMin (end of official shift)
          const refMin =
            typeof tanStartMin === "number"
              ? tanStartMin
              : isNight
              ? timeToMinutes(member.shiftStart) +
                (cfg.tongGioHanhChinh || 8) * 60
              : timeToMinutes(member.shiftStart) +
                (cfg.tongGioHanhChinh || 8) * 60;

          let diffMin = minutesOfDay - refMin;
          if (diffMin < 0) {
            // if wrapped over midnight, add 24h
            diffMin += 24 * 60;
          }

          if (diffMin >= 60) {
            // floor hours (drop minutes)
            const otHours = minutesToFlooredHours(diffMin);

            // ====== apply member limit (from members.overtimeLimit.monthlyLimit) ======
            const memberLimit = Number(member.overtimeLimit?.monthlyLimit || 0);
            const memberWorked = Number(member.overtimeLimit?.workedHours || 0);
            const memberRemaining = Math.max(memberLimit - memberWorked, 0);

            // allowed hours to add (cannot exceed remaining)
            const addHours = Math.min(otHours, memberRemaining);

            if (addHours > 0) {
              // update members.overtimeLimit
              const memberUpdateRes = await updateMemberOvertimeWorked(
                member.id,
                addHours
              );
              totalAddedHours += addHours;

              // ====== BONUS calculation based on overtimeLimits doc & bonusConfig ======
              let bonusGiven = 0;
              try {
                // Find overtimeLimits doc for this member's limit key
                const limitKey = String(memberLimit || 0);
                const limitDoc = limits[limitKey]; // from loadBonusAndLimits()

                const bonusEnabled = Boolean(bonus?.batThuongTangCa);
                const bonusEvery = Number(bonus?.thuongSauBaoNhieuTieng || 0);
                const bonusAmount = Number(bonus?.congThemBaoNhieuGio || 0);
                const selectedLimits = bonus?.cacNhanhDuocThuong || [];

                // check no-bonus codes (LEAVE_CODES + custom)
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
                  // strategy: give floor(diffMin/60 / bonusEvery) * bonusAmount
                  const bonusUnits = Math.floor(otHours / bonusEvery);
                  bonusGiven = bonusUnits * bonusAmount;

                  // cap bonusGiven to remaining bonus bucket from overtimeLimits if present
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

              // ====== Update overtimeLimits doc member entry to reflect new values ======
              // ====== cập nhật overtimelimits ======
              try {
                if (memberLimit && memberLimit > 0) {
                  // compute patches for overtimeLimits members[] schema
                  // load existing snapshot once
                  // We'll derive fields: gioDaLam, gioConLai, soNgayDaLam, ngayConLai, gioThuongDaNhan, gioThuongConLai
                  // For safe update, fetch doc live
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

                    // build new member payload (merge with existing)
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

                    const newGioDaLam = existedGioDaLam + addHours;
                    const newSoNgay = existedSoNgay + 1;
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

                    const newNgayConLai = Math.max(
                      Number(existing.ngayConLai || limitData.days || 0) - 1,
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

                    // update member entry inside doc
                    await updateOvertimeLimitsMember(
                      memberLimit,
                      member.id,
                      patch
                    );
                  }
                }
              } catch (e) {
                console.warn("Failed updating overtimeLimits member", e);
              }

              // Finally, write an overtime record in 'overtimes' collection (optional)
              // Write simple record to allow history / audit (id auto)
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
                console.warn("Failed writing overtime record", e);
              }
            } // end addHours > 0
          } // end diffMin >= 60
        } // end checkout branch
      } // end for lines

      // done
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
