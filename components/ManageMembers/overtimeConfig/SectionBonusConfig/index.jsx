import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { Save } from "lucide-react";
import { LEAVE_MAP, LEAVE_CODES } from "../../../../hooks/useOvertimeParser/parseHelpers";import LimitTree from "./LimitTree";
import NoBonusCodes from "./NoBonusCodes";

export default function SectionBonusConfig({ config, setConfig }) {
  const [limitTree, setLimitTree] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [selectedLimits, setSelectedLimits] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // === Lấy dữ liệu cây giới hạn (realtime)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "overtimeLimits"), (snap) => {
      const tree = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const key = `${data.limit}h`;
        tree[key] = data.members || [];
      });
      setLimitTree(tree);
    });
    return () => unsub();
  }, []);

  // === Lấy cấu hình thưởng (realtime)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "bonusConfig", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSelectedLimits(data.selectedLimits || []);
        setBonusEnabled(Boolean(data.bonusEnabled));
        setConfig((prev) => ({ ...prev, ...data }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleChange = (key, value) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const defaultConfig = {
    bonusEvery: 2,
    bonusAmount: 0.5,
    customNoBonus: [],
  };
  const merged = { ...defaultConfig, ...config };

  // === Mở/đóng nhóm
  const toggleGroup = (key) =>
    setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  // === Chọn giới hạn (local only)
  const toggleLimit = (limitKey) => {
    const isRemoving = selectedLimits.includes(limitKey);
    const newList = isRemoving
      ? selectedLimits.filter((k) => k !== limitKey)
      : [...selectedLimits, limitKey];
    setSelectedLimits(newList);
  };

  // === Lưu cấu hình thưởng
  const handleSave = async () => {
    try {
      await setDoc(doc(db, "bonusConfig", "main"), {
        ...merged,
        bonusEnabled,
        selectedLimits,
      });

      if (!bonusEnabled) {
        alert("✅ Đã lưu (thưởng đang tắt)");
        return;
      }

      const limitsSnap = await getDocs(collection(db, "overtimeLimits"));

      for (const docSnap of limitsSnap.docs) {
        const data = docSnap.data();
        const key = `${data.limit}h`;

        if (selectedLimits.includes(key)) {
          const members = (data.members || []).map((m) => ({
            ...m,
            thuongTangCa: {
              sauBaoNhieuTieng: merged.bonusEvery,
              congThem: merged.bonusAmount,
            },
          }));
          await setDoc(
            doc(db, "overtimeLimits", docSnap.id),
            { ...data, members },
            { merge: true }
          );
        } else {
          const members = (data.members || []).map((m) => {
            const { thuongTangCa, ...rest } = m;
            return rest;
          });
          await setDoc(
            doc(db, "overtimeLimits", docSnap.id),
            { ...data, members },
            { merge: true }
          );
        }
      }

      alert("✅ Đã lưu cấu hình thưởng và đồng bộ nhân viên!");
    } catch (err) {
      console.error("Lỗi khi lưu cấu hình thưởng:", err);
      alert("❌ Lưu thất bại, xem console.");
    }
  };

  if (loading)
    return (
      <div className="text-sm text-gray-400">
        Đang tải cấu hình thưởng tăng ca...
      </div>
    );

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-950/20 space-y-4">
      {/* Header gọn đẹp */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          💰 Thưởng tăng ca
        </h3>

        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${bonusEnabled
                ? "text-green-600 dark:text-green-400"
                : "text-gray-500 dark:text-gray-400"
              }`}
          >
            {bonusEnabled ? "Đang dùng" : "Đang tắt"}
          </span>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={bonusEnabled}
              onChange={async (e) => {
                const newVal = e.target.checked;
                setBonusEnabled(newVal);
                handleChange("bonusEnabled", newVal);

                // ⚠️ Nếu tắt thưởng
                if (!newVal) {
                  if (selectedLimits.length === 0) {
                    await setDoc(
                      doc(db, "bonusConfig", "main"),
                      { bonusEnabled: false },
                      { merge: true }
                    );
                    setBonusEnabled(false);
                    handleChange("bonusEnabled", false);
                    return;
                  }

                  const confirmed = window.confirm(
                    "⚠️ Bạn có chắc muốn TẮT thưởng tăng ca?\nTất cả nhân viên trong các nhánh được chọn sẽ bị gỡ thưởng."
                  );
                  if (!confirmed) {
                    setBonusEnabled(true);
                    return;
                  }

                  const limits = await getDocs(collection(db, "overtimeLimits"));
                  for (const docSnap of limits.docs) {
                    const data = docSnap.data();
                    const members = (data.members || []).map((m) => {
                      const { thuongTangCa, ...rest } = m;
                      return rest;
                    });
                    await setDoc(
                      doc(db, "overtimeLimits", docSnap.id),
                      { ...data, members },
                      { merge: true }
                    );
                  }

                  setSelectedLimits([]);
                  await setDoc(
                    doc(db, "bonusConfig", "main"),
                    { bonusEnabled: false, selectedLimits: [] },
                    { merge: true }
                  );

                  alert("✅ Đã tắt toàn bộ thưởng tăng ca và gỡ thưởng khỏi nhân viên!");
                } else {
                  await setDoc(
                    doc(db, "bonusConfig", "main"),
                    { bonusEnabled: true },
                    { merge: true }
                  );
                }
              }}
              className="sr-only peer"
            />
            <div
              className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700
                   peer-checked:bg-green-500 transition-all relative after:content-[''] after:absolute 
                   after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:rounded-full 
                   after:transition-all peer-checked:after:translate-x-full"
            ></div>
          </label>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {bonusEnabled && (
          <motion.div
            key="bonus-section"
            initial={{ opacity: 0, height: 0, y: -10 }} 
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            onAnimationComplete={() => {
              // Tự cuộn xuống trung tâm vùng “Thưởng tăng ca”
              const el = document.getElementById("bonus-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
          >
            <div id="bonus-section" className="mt-3 space-y-4">
              {/* Điều kiện thưởng */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Sau</span>
                <input
                  type="number"
                  step="0.5"
                  className="w-16 text-center border rounded dark:bg-gray-800 dark:text-gray-100"
                  value={merged.bonusEvery}
                  onChange={(e) =>
                    handleChange("bonusEvery", Number(e.target.value))
                  }
                />
                <span>tiếng tăng ca, cộng thêm</span>
                <input
                  type="number"
                  step="0.1"
                  className="w-16 text-center border rounded dark:bg-gray-800 dark:text-gray-100"
                  value={merged.bonusAmount}
                  onChange={(e) =>
                    handleChange("bonusAmount", Number(e.target.value))
                  }
                />
                <span>giờ thưởng</span>
              </div>

              {/* Tree */}
              <LimitTree
                limitTree={limitTree}
                openGroups={openGroups}
                selectedLimits={selectedLimits}
                toggleGroup={toggleGroup}
                toggleLimit={toggleLimit}
              />

              {/* Mã không được thưởng */}
              <NoBonusCodes
                merged={merged}
                handleChange={handleChange}
                newCode={newCode}
                setNewCode={setNewCode}
              />

              <div className="flex justify-end pt-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  <Save size={16} /> Lưu
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
