// hooks/useOvertimeParser/firestoreOps.js
// Hàm thao tác với Firestore để lấy và lưu dữ liệu tăng ca

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

export async function getShiftMap(uid, date) {
  const shiftMap = {};
  const shiftQ = query(
    collection(db, "shiftSchedules"),
    where("userId", "==", uid),
    where("date", "==", date)
  );
  const snap = await getDocs(shiftQ);
  snap.docs.forEach((d) => {
    const data = d.data();
    shiftMap[data.memberId] = {
      shift: data.shift,
      shiftStart: data.shiftStart,
    };
  });
  return { shiftMap };
}

export async function saveOvertimeRecord(
  user,
  member,
  date,
  { shift, checkTime, mode, note, calcOvertimeHours }
) {
  const q = query(
    collection(db, "overtimes"),
    where("userId", "==", user.uid),
    where("memberId", "==", member.id),
    where("currentDate", "==", date)
  );
  const snap = await getDocs(q);
  let added = 0,
    updated = 0,
    skipped = 0,
    newHours = 0;

  if (snap.empty) {
    await addDoc(collection(db, "overtimes"), {
      userId: user.uid,
      memberId: member.id,
      realName: member.realName,
      nickname: member.nickname || member.realName,
      date,
      currentDate: date,
      shift: shift?.shift || member.shift,
      shiftStart: shift?.shiftStart || member.shiftStart,
      checkIn: mode === "checkin" ? checkTime || "" : "",
      checkOut: mode === "checkout" ? checkTime || "" : "",
      hours: 0,
      note: note || "",
      createdAt: serverTimestamp(),
    });
    added++;
  } else {
    const ref = doc(db, "overtimes", snap.docs[0].id);
    const prev = snap.docs[0].data();
    const newCheckIn =
      mode === "checkin" ? checkTime || prev.checkIn : prev.checkIn;
    const newCheckOut =
      mode === "checkout" ? checkTime || prev.checkOut : prev.checkOut;

  // newHours = 0; OT hours đã được tính ở parser, không tính lại ở đây

    await updateDoc(ref, {
      checkIn: newCheckIn,
      checkOut: newCheckOut,
      hours: newHours,
      updatedAt: serverTimestamp(),
    });
    updated++;
  }

  return { added, updated, skipped, newHours };
}

export async function updateMemberOvertime(member, newHours, setMembers) {
  const memberRef = doc(db, "members", member.id);
  const worked = member.overtimeLimit?.workedHours || 0;
  const limit = member.overtimeLimit?.monthlyLimit || 0;
  const total = worked + newHours;
  const remain = Math.max(limit - total, 0);

  await updateDoc(memberRef, {
    "overtimeLimit.workedHours": total,
    "overtimeLimit.remaining": remain,
  });

  setMembers?.((prev) =>
    prev.map((m) =>
      m.id === member.id
        ? {
            ...m,
            overtimeLimit: {
              ...m.overtimeLimit,
              workedHours: total,
              remaining: remain,
            },
          }
        : m
    )
  );
}
