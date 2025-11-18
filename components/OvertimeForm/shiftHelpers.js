// Shared helpers used by OvertimeForm + modal.
// Keeps Firestore reads/writes and time logic in one place.

import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export const timeToMinutes = (t) => {
  if (!t) return null;
  const s = String(t).trim();
  const parts = s.split(":").map((n) => Number(n || 0));
  if (parts.length < 2) return null;
  const [hh, mm] = parts;
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return (hh % 24) * 60 + (mm % 60);
};

export const minutesToHHMM = (min) => {
  if (min == null) return null;
  min = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

// inclusive range with wrap-around support
export const inRangeWrap = (min, max, val) => {
  if (min == null || max == null || val == null) return false;
  if (min <= max) return val >= min && val <= max;
  // wrap-around e.g., 22:00 -> 04:00
  return val >= min || val <= max;
};

// load shiftConfig day/night
export async function loadShiftConfigs() {
  try {
    const dayRef = doc(db, "shiftConfig", "day");
    const nightRef = doc(db, "shiftConfig", "night");
    const [daySnap, nightSnap] = await Promise.all([getDoc(dayRef), getDoc(nightRef)]);
    const day = daySnap.exists() ? daySnap.data() : null;
    const night = nightSnap.exists() ? nightSnap.data() : null;
    return { day, night };
  } catch (e) {
    console.warn("loadShiftConfigs error", e);
    return { day: null, night: null };
  }
}

// get shiftSchedule doc for given member & selectedDate (YYYY-MM-DD)
export async function getShiftOfMember(memberId, selectedDate) {
  if (!selectedDate) return null;
  const dateStr = new Date(selectedDate).toISOString().slice(0, 10);
  const docId = `${dateStr}__${memberId}`;
  try {
    const ref = doc(db, "shiftSchedules", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { ...snap.data(), _docId: snap.id, _exists: true };
  } catch (e) {
    console.warn("getShiftOfMember error", e);
    return null;
  }
}


// update single shiftSchedules.shiftStart (used when user approves)
export async function updateShiftStart(memberId, selectedDate, newShiftStart) {
  const dateStr = new Date(selectedDate).toISOString().slice(0, 10);
  const docId = `${dateStr}__${memberId}`;
  const ref = doc(db, "shiftSchedules", docId);
  try {
    // try update first
    await updateDoc(ref, { shiftStart: newShiftStart });
    return true;
  } catch (e) {
    // nếu update thất bại — thử tạo doc (merge) để không ghi đè các trường khác
    try {
      await setDoc(ref, { shiftStart: newShiftStart }, { merge: true });
      return true;
    } catch (e2) {
      console.warn("updateShiftStart failed (setDoc fallback):", e2);
      return false;
    }
  }
}


function assertValidTimeField(shiftCfg, key) {
  if (!shiftCfg || !shiftCfg[key]) return false;
  return timeToMinutes(shiftCfg[key]) != null;
}

export function buildWindows(shiftCfg, isNight) {
  if (!shiftCfg) return null;

  const toMin = timeToMinutes;
  const EXTRA = 6 * 60;
  const add1Day = (m) => m + 1440;

  // required keys list (tùy theo tên field của DB)
  const required = [
    "lenCaSomBatDau", "lenCaSomKetThuc",
    "tanCaSomBatDau", "tanCaSomKetThuc",
    "lenCaMuonBatDau", "lenCaMuonKetThuc",
    "tanCaMuonBatDau", "tanCaMuonKetThuc"
  ];

  for (const k of required) {
    if (!assertValidTimeField(shiftCfg, k)) {
      console.warn(`buildWindows: missing/invalid shiftCfg.${k}`);
      return null;
    }
  }

  if (!isNight) {
    return {
      som: {
        checkin: [toMin(shiftCfg.lenCaSomBatDau), toMin(shiftCfg.lenCaSomKetThuc)],
        checkout: [toMin(shiftCfg.tanCaSomBatDau), toMin(shiftCfg.tanCaSomKetThuc) + EXTRA],
      },
      muon: {
        checkin: [toMin(shiftCfg.lenCaMuonBatDau), toMin(shiftCfg.lenCaMuonKetThuc)],
        checkout: [toMin(shiftCfg.tanCaMuonBatDau), toMin(shiftCfg.tanCaMuonKetThuc) + EXTRA],
      },
    };
  }

  return {
    som: {
      checkin: [toMin(shiftCfg.lenCaSomBatDau), toMin(shiftCfg.lenCaSomKetThuc)],
      checkout: [add1Day(toMin(shiftCfg.tanCaSomBatDau)), add1Day(toMin(shiftCfg.tanCaSomKetThuc))],
    },
    muon: {
      checkin: [toMin(shiftCfg.lenCaMuonBatDau), toMin(shiftCfg.lenCaMuonKetThuc)],
      checkout: [add1Day(toMin(shiftCfg.tanCaMuonBatDau)), add1Day(toMin(shiftCfg.tanCaMuonKetThuc)) ],
    },
  };
}

