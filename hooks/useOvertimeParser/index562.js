// hooks/useOvertimeParser/index.js
import { useRef } from "react";
import dayjs from "dayjs";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

import {
  LEAVE_CODES,
  normalizeName as normalizeFromHelpers,
} from "./parseHelpers";

const normalizeName = (s) =>
  typeof normalizeFromHelpers === "function" ? normalizeFromHelpers(s) : String(s || "").trim();

const t2m = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const m2t = (m) => {
  const hh = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const floorHours = (min) => (min < 0 ? 0 : Math.floor(min / 60));

// ===================== CONFIG BẮT BUỘC TỪ LUẬT ======================
const LEN_SOM_START = t2m("18:45");
const LEN_SOM_END   = t2m("19:00");

const LEN_MUON_START = t2m("19:45");
const LEN_MUON_END   = t2m("20:00");

const TAN_SOM_START = t2m("04:00");
const TAN_SOM_END   = t2m("04:15");

const TAN_MUON_START = t2m("05:00");
const TAN_MUON_END   = t2m("05:15");

// mốc tăng ca
const OT_SOM_MOC  = t2m("04:00");
const OT_MUON_MOC = t2m("05:00");

// =====================================================================
async function upsertShift(dateStr, member, patch) {
  const id = `${dateStr}__${member.id}`;
  const ref = doc(db, "shiftSchedules", id);
  await setDoc(
    ref,
    {
      userId: member.userId || "",
      date: dateStr,
      memberId: member.id,
      realName: member.realName,
      nickname: member.nickname,
      shift: member.shift || "",
      shiftStart: member.shiftStart || "",
      updatedAt: serverTimestamp(),
      ...patch,
    },
    { merge: true }
  );
}

async function updateWorked(memberId, addHours, setMembers) {
  const ref = doc(db, "members", memberId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();

  const oldWorked = Number(data.overtimeLimit?.workedHours || 0);
  const limit = Number(data.overtimeLimit?.monthlyLimit || 0);
  const newWorked = oldWorked + addHours;
  const remaining = Math.max(limit - newWorked, 0);

  await updateDoc(ref, {
    "overtimeLimit.workedHours": newWorked,
    "overtimeLimit.remaining": remaining,
    updatedAt: serverTimestamp(),
  });

  setMembers((prev) =>
    prev.map((m) =>
      m.id === memberId
        ? {
            ...m,
            overtimeLimit: {
              ...m.overtimeLimit,
              workedHours: newWorked,
              remaining,
              monthlyLimit: limit,
            },
          }
        : m
    )
  );

  return { limit, newWorked, remaining };
}

async function updateLimitDoc(limitKey, memberId, patch) {
  const ref = doc(db, "overtimeLimits", `limit_${limitKey}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const arr = data.members || [];

  const idx = arr.findIndex((x) => x.id === memberId);
  if (idx === -1) arr.push({ id: memberId, ...patch });
  else arr[idx] = { ...arr[idx], ...patch };

  await setDoc(ref, { members: arr }, { merge: true });
}

function findMember(list, name) {
  const norm = normalizeName(name);
  return list.find((m) => {
    const r = normalizeName(m.realName);
    const n = normalizeName(m.nickname);
    return r === norm || n === norm || r.includes(norm) || n.includes(norm);
  });
}

export default function useOvertimeParser({
  user,
  members,
  setMembers,
  selectedDate,
}) {
  const lock = useRef(false);

  async function parseText(text, mode = "checkin") {
    if (lock.current) return;
    lock.current = true;

    try {
      if (!user?.uid) throw new Error("Chưa đăng nhập");

      const lines = text.split("\n").map((v) => v.trim()).filter(Boolean);
      const dateStr = (selectedDate ? dayjs(selectedDate) : dayjs()).format("YYYY-MM-DD");

      let totalOT = 0;
      let totalBonus = 0;
      let updated = 0;
      let skipped = 0;

      // tải bonus + limit
      const bonusSnap = await getDoc(doc(db, "bonusConfig", "main"));
      const bonusCfg = bonusSnap.exists() ? bonusSnap.data() : {};

      const limitSnaps = await getDocs(collection(db, "overtimeLimits"));
      const limitDocs = {};
      limitSnaps.forEach((d) => {
        const data = d.data();
        limitDocs[data.limit] = data;
      });

      for (const raw of lines) {
        const [nameRaw, timeRaw] = raw.split("/");
        if (!nameRaw || !timeRaw) {
          skipped++;
          continue;
        }

        const name = nameRaw.replace(/^\d+\./, "").trim();
        const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) {
          skipped++;
          continue;
        }

        const member = findMember(members, name);
        if (!member) {
          skipped++;
          continue;
        }

        const leave = LEAVE_CODES.includes(timeRaw);
        if (leave) {
          await upsertShift(dateStr, member, { note: timeRaw });
          continue;
        }

        const [hh, mm] = timeMatch;
        const totalMin = parseInt(hh) * 60 + parseInt(mm);

        // ======================= CHECK-IN ======================
        if (mode === "checkin") {
          let ok =
            (totalMin >= LEN_SOM_START && totalMin <= LEN_SOM_END) ||
            (totalMin >= LEN_MUON_START && totalMin <= LEN_MUON_END);

          if (!ok) {
            await upsertShift(dateStr, member, {
              lenCa: m2t(totalMin),
              note: "invalid-checkin",
            });
            continue;
          }

          await upsertShift(dateStr, member, { lenCa: m2t(totalMin) });
          updated++;
          continue;
        }

        // ======================= CHECK-OUT ======================
        let usedType = null;

        const inSom =
          totalMin >= TAN_SOM_START && totalMin <= TAN_SOM_END;
        const inMuon =
          totalMin >= TAN_MUON_START && totalMin <= TAN_MUON_END;

        if (inSom) usedType = "som";
        else if (inMuon) usedType = "muon";
        else {
          // không thuộc 2 khung → xem giờ để phân loại
          usedType = totalMin < 5 * 60 ? "som" : "muon";
        }

        const usedStart = usedType === "som" ? TAN_SOM_START : TAN_MUON_START;

        if (totalMin < usedStart) {
          // ra quá sớm → invalid
          await upsertShift(dateStr, member, {
            xuongCa: m2t(totalMin),
            note: "invalid-checkout",
          });
          continue;
        }

        await upsertShift(dateStr, member, { xuongCa: m2t(totalMin) });
        updated++;

        const id = `${dateStr}__${member.id}`;
        const ssSnap = await getDoc(doc(db, "shiftSchedules", id));
        const ss = ssSnap.data() || {};

        if (!ss.lenCa || !ss.xuongCa) continue;
        if (ss.note === "invalid-checkin" || ss.note === "invalid-checkout") continue;

        const mCheckin = t2m(ss.lenCa);
        const mCheckout = totalMin;

        // đủ 8 giờ hành chính
        const hanhChinh = 8;

        // OT theo mốc đúng
        const mOC = usedType === "som" ? OT_SOM_MOC : OT_MUON_MOC;

        let diff = mCheckout - mOC;
        if (diff < 0) diff += 24 * 60;

        if (diff < 60) continue;

        const otHours = floorHours(diff);

        const limit = member.overtimeLimit?.monthlyLimit || 0;
        const worked = member.overtimeLimit?.workedHours || 0;
        const remain = limit - worked;
        const addHours = Math.min(otHours, remain);

        if (addHours <= 0) continue;

        // update members
        await updateWorked(member.id, addHours, setMembers);
        totalOT += addHours;

        // ============ BONUS ============
        let bonus = 0;
        try {
          if (bonusCfg.batThuongTangCa) {
            const every = bonusCfg.thuongSauBaoNhieuTieng || 0;
            const amount = bonusCfg.congThemBaoNhieuGio || 0;
            const sel = bonusCfg.cacNhanhDuocThuong || [];

            const key = String(limit);

            if (sel.includes(key) && otHours >= every) {
              bonus = amount;
            }
          }
        } catch {}

        totalBonus += bonus;

        // ==== update overtimeLimits doc ====
        try {
          const ldoc = limitDocs[limit];
          if (ldoc) {
            const existing =
              (ldoc.members || []).find((x) => x.id === member.id) || {};
            const newWorked = (existing.gioDaLam || 0) + addHours;
            const newBonus = (existing.gioThuongDaNhan || 0) + bonus;
            const plan = ldoc.limit || 0;

            await updateLimitDoc(limit, member.id, {
              ten: member.nickname || member.realName,
              gioDaLam: newWorked,
              gioConLai: Math.max(plan - newWorked, 0),
              soNgayDaLam: (existing.soNgayDaLam || 0) + 1,
              ngayConLai: Math.max((existing.ngayConLai || ldoc.days || 0) - 1, 0),
              gioThuongDaNhan: newBonus,
              gioThuongConLai: Math.max((existing.gioThuongConLai || 0) - bonus, 0),
            });
          }
        } catch {}

        // history
        await setDoc(doc(collection(db, "overtimes")), {
          userId: user.uid,
          memberId: member.id,
          realName: member.realName,
          nickname: member.nickname,
          date: dateStr,
          checkIn: ss.lenCa,
          checkOut: ss.xuongCa,
          addedHours: addHours,
          bonusGiven: bonus,
          createdAt: serverTimestamp(),
        });
      }

      return {
        updated,
        skipped,
        totalOT,
        totalBonus,
      };
    } finally {
      lock.current = false;
    }
  }

  return { parseText };
}
