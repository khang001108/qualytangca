import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useOvertimeConfig() {
  const [config, setConfig] = useState({ defaultDailyCap: 6, loading: true });

  useEffect(() => {
    const ref = doc(db, "overtimeConfig", "global");

    // Realtime lắng nghe thay đổi từ Firestore
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setConfig({ ...snap.data(), loading: false });
      } else {
        setConfig({ defaultDailyCap: 6, loading: false });
      }
    });

    return () => unsub();
  }, []);

  return config; // { defaultDailyCap, ... }
}
