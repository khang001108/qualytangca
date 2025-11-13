import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function useOvertimeDates() {
  const [overtimeDates, setOvertimeDates] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, "overtimeLimits"));
        const data = {};
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.memberId && d.lastOvertimeDate)
            data[d.memberId] = d.lastOvertimeDate;
        });
        setOvertimeDates(data);
      } catch (err) {
        console.error("❌ Lỗi tải overtimeLimits:", err);
      }
    };
    fetchData();
  }, []);

  return overtimeDates;
}
