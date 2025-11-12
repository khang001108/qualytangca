// components/ManageMembers/overtimeConfig/SectionOvertimeConfig/index.jsx
// Hiển thị cấu hình giới hạn giờ tăng ca cho nhân viên

import React, { useEffect, useState } from "react";
import { collection,onSnapshot, getDocs, deleteDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useShiftFirestore } from "../SectionShiftConfig/useShiftFirestore";
import { Clock } from "lucide-react";
import LimitTreeView from "./LimitTreeView";
import NoLimitView from "./NoLimitView";
// import { updateOvertimeLimits } from "./overtimeConfig/SectionOvertimeConfig";


export async function updateOvertimeLimits(tree, selectedOption, shiftConfig) {
  try {
    const overtimeRef = collection(db, "overtimeLimits");
    const snapshot = await getDocs(overtimeRef);
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const promises = Object.keys(selectedOption).map(async (limitKey) => {
      const members = tree[limitKey] || [];
      const limitNum = Number(limitKey);
      const chosen = selectedOption[limitKey];
      if (!chosen) return;

      const days = Math.floor(chosen.days);
      const perDay = Math.floor(chosen.perDay);
      const totalLimit = days * perDay;

      const membersWithRemaining = members.map((m) => {
        const worked = Math.floor(m.overtimeLimit?.workedHours || 0);
        const remainingHours = Math.max(totalLimit - worked, 0);
        const remainingDays = Math.floor(remainingHours / perDay);
        const remainderHours = remainingHours % perDay;

        return {
          id: m.id,
          name: m.nickname || m.realName || "Không tên",
          monthlyLimit: totalLimit,
          workedHours: worked,
          remainingDays,
          remainingHours: remainderHours,
        };
      });

      await setDoc(
        doc(db, "overtimeLimits", `limit_${limitNum}_day_${days}`),
        {
          createdAt: serverTimestamp(),
          month: month + 1,
          year,
          limit: totalLimit,
          days,
          perDay,
          rule: "1h sau tan ca hành chính = 1h tăng ca",
          shiftEndDayEarly: shiftConfig?.day?.tanCaSomBatDau || "--:--",
          shiftEndDayLate: shiftConfig?.day?.tanCaMuonBatDau || "--:--",
          shiftEndNightEarly: shiftConfig?.night?.tanCaSomBatDau || "--:--",
          shiftEndNightLate: shiftConfig?.night?.tanCaMuonBatDau || "--:--",
          memberCount: members.length,
          members: membersWithRemaining,
        },
        { merge: true }
      );
    });

    await Promise.all(promises);
    console.log("✅ overtimeLimits updated from LimitSelector");
  } catch (err) {
    console.error("❌ Error updating overtimeLimits:", err);
  }
}

export default function SectionOvertimeLimit() {
  const [defaultDailyCap, setDefaultDailyCap] = useState(6);
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

  // === Đọc lại cấu hình đã lưu từ Firestore để tô vàng các lựa chọn ===
  useEffect(() => {
    const fetchSavedLimits = async () => {
      try {
        const snap = await getDocs(collection(db, "overtimeLimits"));
        const savedOptions = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const limit = data.limit;
          const perDay = data.perDay || data.hoursPerDay;
          const days = data.days || data.totalDays;

          if (limit && days && perDay) {
            savedOptions[String(limit)] = { days, perDay };
          }
        });
        setSelectedOption(savedOptions);
      } catch (err) {
        console.error("❌ Lỗi khi đọc overtimeLimits:", err);
      }
    };

    fetchSavedLimits();
  }, []);

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
    <div className="border border-gray-300 dark:border-gray-500 rounded-2xl p-6 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-xl space-y-6">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
        ⏱️ Giờ tăng ca
      </h3>

      <div className="flex justify-between bg-gray-100 dark:bg-gray-900 border border-gray-700 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <div>
            <div className="font-medium text-gray-800 dark:text-gray-100">

              Chế độ
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-400">
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
          onUpdateOvertimeLimits={() =>
            updateOvertimeLimits(tree, selectedOption, shiftConfig)
          }
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
