// components/ManageMembers/overtimeConfig/SectionOvertimeConfig/index.jsx
// Hiển thị cấu hình giới hạn giờ tăng ca cho nhân viên

import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  getDocs,
  deleteDoc,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useShiftFirestore } from "../SectionShiftConfig/useShiftFirestore";
import { Clock } from "lucide-react";
import LimitTreeView from "./LimitTreeView";
import NoLimitView from "./NoLimitView";

// ============================================================================
//    HÀM REBUILD overtimeLimits TỪ members (nếu cần tạo lại toàn bộ)
// ============================================================================
export async function updateOvertimeLimits() {
  try {
    const overtimeRef = collection(db, "overtimeLimits");
    const membersSnap = await getDocs(collection(db, "members"));

    // Gom nhóm
    const grouped = {};
    membersSnap.docs.forEach((d) => {
      const m = { id: d.id, ...d.data() };
      const limit = m.overtimeLimit?.monthlyLimit || 0;
      if (!grouped[limit]) grouped[limit] = [];
      grouped[limit].push(m);
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const promises = Object.keys(grouped).map(async (limitKey) => {
      const membersList = grouped[limitKey];

      await setDoc(doc(db, "overtimeLimits", `limit_${limitKey}`), {
        createdAt: serverTimestamp(),
        month: month + 1,
        year,
        limit: Number(limitKey),
        memberCount: membersList.length,
        members: membersList.map((m) => ({
          id: m.id,
          name: m.nickname || m.realName || "Không tên",
          workedHours: m.overtimeLimit?.workedHours || 0,
          remaining: m.overtimeLimit?.remaining || 0,
        })),
      });
    });

    await Promise.all(promises);
    console.log("✔ overtimeLimits rebuilt from members");
  } catch (err) {
    console.error("✘ Error updating overtimeLimits:", err);
  }
}

// ============================================================================
//                      SectionOvertimeLimit Component
// ============================================================================
export default function SectionOvertimeLimit() {
  const [defaultDailyCap, setDefaultDailyCap] = useState(6);
  const [members, setMembers] = useState([]);
  const [tree, setTree] = useState({});
  const [loading, setLoading] = useState(true);
  const [bonusConfig, setBonusConfig] = useState({});
  const [bonusEnabled, setBonusEnabled] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "bonusConfig", "main"), (snap) => {
      if (snap.exists()) setBonusConfig(snap.data());
    });
    return unsub;
  }, []);

  // Lấy cấu hình thưởng từ Firestore
  // Selected "days × hours/day" options cho từng limitKey
  const [selectedOption, setSelectedOption] = useState({});

  // Mở/đóng từng nhánh
  const [openGroups, setOpenGroups] = useState({});

  // Bật/tắt chế độ "Giới hạn tăng ca"
  const [useLimitMode, setUseLimitMode] = useState(
    localStorage.getItem("useLimitMode") === "true"
  );

  // Lấy shiftConfig từ Firestore
  const [shiftConfig, setShiftConfig] = useState({});
  const { fetchConfig } = useShiftFirestore(setShiftConfig);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ============================================================================
  //  Lấy danh sách nhân viên (realtime)
  // ============================================================================
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

    return () => unsubscribe();
  }, []);

  // ============================================================================
  //  Gom nhân viên theo giới hạn (monthlyLimit)
  // ============================================================================
  useEffect(() => {
    const grouped = {};

    members.forEach((m) => {
      const limit = m.overtimeLimit?.monthlyLimit || 0;
      const key = String(limit);

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    // Sắp nhân viên theo tên
    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) =>
        (a.nickname || a.realName || "").localeCompare(
          b.nickname || b.realName || ""
        )
      );
    });

    setTree(grouped);
  }, [members]);

  // ============================================================
  // Load lại lựa chọn days × perDay từ Firestore
  // ============================================================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "overtimeLimits"), (snap) => {
      const opts = {};

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const limit = String(data.limit || 0);

        if (data.days && data.perDay) {
          opts[limit] = {
            days: data.days,
            perDay: data.perDay,
          };
        }
      });

      setSelectedOption(opts);
    });

    return unsub;
  }, []);

  // ============================================================================
  //  Toggle giới hạn / không giới hạn
  // ============================================================================
  const handleToggleMode = (checked) => {
    setUseLimitMode(checked);
    localStorage.setItem("useLimitMode", checked);
  };

  // ============================================================================
  //  RENDER
  // ============================================================================
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
          bonusConfig={bonusConfig}
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
