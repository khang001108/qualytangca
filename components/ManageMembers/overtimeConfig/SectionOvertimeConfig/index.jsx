// components/ManageMembers/overtimeConfig/SectionOvertimeConfig/index.jsx
// Hiển thị cấu hình giới hạn giờ tăng ca cho nhân viên


import React, { useEffect, useState } from "react";
import { db } from "../../../../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useShiftFirestore } from "../SectionShiftConfig/useShiftFirestore";
import { Clock } from "lucide-react";
import LimitTreeView from "./LimitTreeView";
import NoLimitView from "./NoLimitView";

export default function SectionOvertimeLimit({ defaultDailyCap = 6 }) {
  const [members, setMembers] = useState([]);
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [useLimitMode, setUseLimitMode] = useState(
    localStorage.getItem("useLimitMode") === "true"
  );

  // === Lấy shiftConfig thực tế từ Firestore ===
  const [shiftConfig, setShiftConfig] = useState({});
  const { fetchConfig } = useShiftFirestore(setShiftConfig);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // === Lấy danh sách nhân viên từ Firestore (realtime) ===
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, "members"), (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMembers(list);
      setLoading(false);
    });

    return () => unsubscribe(); // cleanup listener khi component unmount
  }, []);


  // === Gom nhóm nhân viên theo giới hạn ===
  useEffect(() => {
    const grouped = {};
    members.forEach((m) => {
      const limit = m.overtimeLimit?.monthlyLimit || 0;
      const key = String(limit);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) =>
        (a.nickname || a.realName || "").localeCompare(
          b.nickname || b.realName || ""
        )
      );
    });
    setTree(grouped);
  }, [members]);

  // === Bật/tắt chế độ giới hạn ===
  const handleToggleMode = (checked) => {
    setUseLimitMode(checked);
    localStorage.setItem("useLimitMode", checked);
  };

  // === Render ===
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
          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-indigo-600 relative transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-full"></div>
        </label>
      </div>

      {useLimitMode ? (
        <LimitTreeView
          tree={tree}
          loading={loading}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
          openGroups={openGroups}
          setOpenGroups={setOpenGroups}
          shiftConfig={shiftConfig}
        />
      ) : (
        <NoLimitView
          shiftConfig={shiftConfig}
          defaultDailyCap={defaultDailyCap}
        />
      )}
    </div>
  );
}
