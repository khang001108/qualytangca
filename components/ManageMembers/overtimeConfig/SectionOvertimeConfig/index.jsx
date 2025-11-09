import React, { useEffect, useState } from "react";
import { db } from "../../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Clock } from "lucide-react";
import LimitTreeView from "./LimitTreeView";
import NoLimitView from "./NoLimitView";

export default function SectionOvertimeLimit({
  shiftConfig = { shiftEnd: "17:00" },
  defaultDailyCap = 6,
}) {
  const [members, setMembers] = useState([]);
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [useLimitMode, setUseLimitMode] = useState(
    localStorage.getItem("useLimitMode") === "true"
  );

  const handleToggleMode = (checked) => {
    setUseLimitMode(checked);
    localStorage.setItem("useLimitMode", checked);
  };

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "members"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMembers(data);
      } catch (err) {
        console.error("Fetch members error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const grouped = {};
    members.forEach((m) => {
      const limit = m.overtimeLimit?.monthlyLimit || 0;
      const key = String(limit);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    setTree(grouped);
  }, [members]);

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
        ⏱️ Giờ tăng ca
      </h3>

      <div className="flex justify-between bg-gray-100 dark:bg-gray-900 border rounded-lg p-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Chế độ
            </div>
            <div className="font-medium text-gray-800 dark:text-gray-100">
              {useLimitMode ? "Giới hạn (monthlyLimit)" : "Không giới hạn"}
            </div>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={useLimitMode}
            onChange={(e) => handleToggleMode(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600 transition-all relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
        </label>
      </div>

      {useLimitMode ? (
        <LimitTreeView tree={tree} loading={loading} />
      ) : (
        <NoLimitView shiftConfig={shiftConfig} defaultDailyCap={defaultDailyCap} />
      )}
    </div>
  );
}
