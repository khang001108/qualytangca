// Shared helpers used by OvertimeForm + modal.
// Keeps Firestore reads/writes and time logic in one place.

import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

// ============================================================
// TIME HELPERS
// ============================================================

// "07:54" → 474 phút
export const timeToMinutes = (t) => {
  if (!t) return null;
  const s = String(t).trim();
  const [hh, mm] = s.split(":").map((n) => Number(n || 0));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return (hh % 24) * 60 + (mm % 60);
};

// 474 → "07:54"
export const minutesToHHMM = (min) => {
  if (min == null) return null;
  min = ((min % 1440) + 1440) % 1440;
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

// range check with wrap-around support
export const inRangeWrap = (min, max, val) => {
  if (min == null || max == null || val == null) return false;
  if (min <= max) return val >= min && val <= max;
  // wrap-around case
  return val >= min || val <= max;
};

// ============================================================
// LOAD SHIFT CONFIG (day + night)
// ============================================================
export async function loadShiftConfigs() {
  try {
    const dayRef = doc(db, "shiftConfig", "day");
    const nightRef = doc(db, "shiftConfig", "night");
    const [daySnap, nightSnap] = await Promise.all([
      getDoc(dayRef),
      getDoc(nightRef),
    ]);
    return {
      day: daySnap.exists() ? daySnap.data() : null,
      night: nightSnap.exists() ? nightSnap.data() : null,
    };
  } catch (e) {
    console.warn("loadShiftConfigs error", e);
    return { day: null, night: null };
  }
}

// ============================================================
// GET SHIFT OF MEMBER IN shiftSchedules
// ============================================================

export async function getShiftOfMember(memberId, selectedDate) {
  if (!selectedDate) return null;
  // Dùng local date để tránh lệch timezone khi dùng toISOString()
  const d = new Date(selectedDate);
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const docId = `${dateStr}__${memberId}`;
  try {
    const ref = doc(db, "shiftSchedules", docId);
    const snap = await getDoc(ref);
    return snap.exists()
      ? { ...snap.data(), _docId: snap.id, _exists: true }
      : null;
  } catch (e) {
    console.warn("getShiftOfMember error", e);
    return null;
  }
}

// ============================================================
// UPDATE shiftStart WITHOUT OVERRIDING OTHER FIELDS
// ============================================================

export async function updateShiftStart(memberId, selectedDate, newShiftStart) {
  const dateStr = new Date(selectedDate).toISOString().slice(0, 10);
  const docId = `${dateStr}__${memberId}`;
  const ref = doc(db, "shiftSchedules", docId);

  try {
    await updateDoc(ref, { shiftStart: newShiftStart });
    return true;
  } catch (e) {
    try {
      await setDoc(ref, { shiftStart: newShiftStart }, { merge: true });
      return true;
    } catch (e2) {
      console.warn("updateShiftStart failed:", e2);
      return false;
    }
  }
}

// ============================================================
// VALIDATION
// ============================================================

function assertValidTimeField(shiftCfg, key) {
  if (!shiftCfg || !shiftCfg[key]) return false;
  return timeToMinutes(shiftCfg[key]) != null;
}

// ============================================================
// BUILD WINDOWS (CHECK-IN / CHECK-OUT) FOR DAY / NIGHT SHIFTS
// ============================================================

export function buildWindows(shiftCfg, isNight) {
  if (!shiftCfg) return null;

  const toMin = timeToMinutes;
  const EXTRA = 6 * 60; // bảo vệ lệch giờ check-out
  const add1Day = (m) => m + 1440;

  // required fields
  const required = [
    "lenCaSomBatDau", "lenCaSomKetThuc",
    "tanCaSomBatDau", "tanCaSomKetThuc",
    "lenCaMuonBatDau", "lenCaMuonKetThuc",
    "tanCaMuonBatDau", "tanCaMuonKetThuc"
  ];

  for (const k of required) {
    if (!assertValidTimeField(shiftCfg, k)) {
      console.warn(`buildWindows: missing shiftCfg.${k}`);
      return null;
    }
  }

  // ==========================
  // CA NGÀY
  // ==========================
  if (!isNight) {
    return {
      som: {
        checkin: [
          toMin(shiftCfg.lenCaSomBatDau),
          toMin(shiftCfg.lenCaSomKetThuc)
        ],
        checkout: [
          toMin(shiftCfg.tanCaSomBatDau),
          toMin(shiftCfg.tanCaSomKetThuc) + EXTRA
        ],
      },
      muon: {
        checkin: [
          toMin(shiftCfg.lenCaMuonBatDau),
          toMin(shiftCfg.lenCaMuonKetThuc)
        ],
        checkout: [
          toMin(shiftCfg.tanCaMuonBatDau),
          toMin(shiftCfg.tanCaMuonKetThuc) + EXTRA
        ],
      },
    };
  }

  // ==========================
  // CA ĐÊM — WRAP AROUND
  // ==========================
  return {
    som: {
      checkin: [
        toMin(shiftCfg.lenCaSomBatDau),
        toMin(shiftCfg.lenCaSomKetThuc)
      ],
      checkout: [
        add1Day(toMin(shiftCfg.tanCaSomBatDau)),
        add1Day(toMin(shiftCfg.tanCaSomKetThuc))
      ],
    },
    muon: {
      checkin: [
        toMin(shiftCfg.lenCaMuonBatDau),
        toMin(shiftCfg.lenCaMuonKetThuc)
      ],
      checkout: [
        add1Day(toMin(shiftCfg.tanCaMuonBatDau)),
        add1Day(toMin(shiftCfg.tanCaMuonKetThuc))
      ],
    },
  };
}
