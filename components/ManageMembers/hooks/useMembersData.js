import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function useMembersData(user) {
  const [members, setMembers] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "" });

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "members"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        overtimeLimit: d.data().overtimeLimit || {},
      }));
      setMembers(data);
    });
    return () => unsub();
  }, [user?.uid]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  return { members, setMembers, toast, showToast };
}
