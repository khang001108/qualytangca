import React, { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function OvertimeTreeTextStyle() {
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "members"));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Gom nhóm theo monthlyLimit
        const grouped = {};
        data.forEach((m) => {
          const limit = m.overtimeLimit?.monthlyLimit ?? 0;
          if (!grouped[limit]) grouped[limit] = [];
          grouped[limit].push(m);
        });

        setTree(grouped);
      } catch (err) {
        console.error("Lỗi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  if (loading) return <p className="p-4">Đang tải...</p>;

  const sortedLimits = Object.keys(tree).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="p-4 font-mono text-sm bg-gray-900 text-green-400 rounded-lg">
      <p className="mb-2 text-indigo-400">🌳 Cây giới hạn tăng ca</p>
      <div>
        {sortedLimits.map((limit, idx) => {
          const members = tree[limit];
          const lastLimit = idx === sortedLimits.length - 1;

          return (
            <div key={limit}>
              <div className="font-semibold text-amber-300">
                {lastLimit ? "└── " : "├── "}Giới hạn {limit} tiếng
              </div>
              {members.map((m, i) => {
                const last = i === members.length - 1;
                return (
                  <div key={m.id} className="ml-6 text-green-300">
                    {last ? "└── " : "├── "}
                    {m.nickname || m.realName || "Không tên"}
                    <span className="text-gray-500">
                      {" "}
                      ({m.overtimeLimit?.workedHours ?? 0}h)
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
