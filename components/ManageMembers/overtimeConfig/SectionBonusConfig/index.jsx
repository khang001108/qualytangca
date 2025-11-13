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
import LimitTree from "./LimitTree";
import NoBonusCodes from "./NoBonusCodes";

export default function SectionBonusConfig({ config, setConfig }) {
  const [limitTree, setLimitTree] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [selectedLimits, setSelectedLimits] = useState([]);
  const [newCode, setNewCode] = useState("");
  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // =========================================
  //   LẤY DANH SÁCH GIỚI HẠN (overtimeLimits)
  // =========================================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "overtimeLimits"), (snap) => {
      const tree = {};

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const limitNum = Number(data.limit || data.monthlyLimit || 0);

        if (!tree[String(limitNum)]) tree[String(limitNum)] = [];
        tree[String(limitNum)] = data.members || [];
      });

      setLimitTree(tree);
    });

    return () => unsub();
  }, []);

  // =========================================
  //      LẤY CẤU HÌNH THƯỞNG (realtime)
  // =========================================
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "bonusConfig", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        setSelectedLimits(data.cacNhanhDuocThuong || []);
        setBonusEnabled(Boolean(data.batThuongTangCa));

        setConfig((prev) => ({
          ...prev,
          bonusEvery: Number(data.thuongSauBaoNhieuTieng ?? 2),
          bonusAmount: Number(data.congThemBaoNhieuGio ?? 0.5),
          customNoBonus: data.cacMaKhongThuong || [],
        }));
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

  const toggleGroup = (key) =>
    setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  const toggleLimit = (limitKey) => {
    const exists = selectedLimits.includes(limitKey);
    const updated = exists
      ? selectedLimits.filter((k) => k !== limitKey)
      : [...selectedLimits, limitKey];
    setSelectedLimits(updated);
  };

  // =========================================
  //               LƯU CẤU HÌNH
  // =========================================
  const handleSave = async () => {
    try {
      await setDoc(doc(db, "bonusConfig", "main"), {
        thuongSauBaoNhieuTieng: Number(merged.bonusEvery),
        congThemBaoNhieuGio: Number(merged.bonusAmount),
        batThuongTangCa: bonusEnabled,
        cacNhanhDuocThuong: selectedLimits,
        cacMaKhongThuong: merged.customNoBonus || [],
      });

      // TẮT THƯỞNG
      if (!bonusEnabled) {
        alert("Đã lưu (thưởng đang tắt)");
        return;
      }

      // BẬT THƯỞNG → CẬP NHẬT TỪNG MEMBER TRONG overtimeLimits
      const limitsSnap = await getDocs(collection(db, "overtimeLimits"));

      for (const docSnap of limitsSnap.docs) {
        const data = docSnap.data();
        const limitKey = String(data.limit);

        const newMembers = (data.members || []).map((m) => {
          if (selectedLimits.includes(limitKey)) {
            return {
              ...m,
              thuongTangCa: {
                sauBaoNhieuTieng: merged.bonusEvery,
                congThem: merged.bonusAmount,
              },
            };
          } else {
            const { thuongTangCa, ...rest } = m;
            return rest;
          }
        });

        await setDoc(
          doc(db, "overtimeLimits", docSnap.id),
          { ...data, members: newMembers },
          { merge: true }
        );
      }

      alert("Đã lưu cấu hình thưởng và đồng bộ nhân viên!");
    } catch (err) {
      console.error("Lỗi khi lưu cấu hình thưởng:", err);
      alert("❌ Lưu thất bại, xem console.");
    }
  };

  if (loading)
    return (
      <div className="text-sm text-gray-400">Đang tải cấu hình thưởng…</div>
    );

  return (
    <div className="border border-gray-300 dark:border-gray-500 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-950/20 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          💰 Thưởng tăng ca
        </h3>

        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${bonusEnabled ? "text-green-600" : "text-gray-500"
              }`}
          >
            {bonusEnabled ? "Đang dùng" : "Đang tắt"}
          </span>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={bonusEnabled}
              onChange={(e) => setBonusEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div
              className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-green-500 relative
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all
                peer-checked:after:translate-x-full"
            ></div>
          </label>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {bonusEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Điều kiện thưởng */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Sau</span>
              <input
                type="number"
                step="0.5"
                className="w-16 text-center border rounded bg-white dark:bg-gray-800"
                value={merged.bonusEvery}
                onChange={(e) =>
                  handleChange("bonusEvery", Number(e.target.value))
                }
              />
              <span>tiếng tăng ca, cộng thêm</span>
              <input
                type="number"
                step="0.1"
                className="w-16 text-center border rounded bg-white dark:bg-gray-800"
                value={merged.bonusAmount}
                onChange={(e) =>
                  handleChange("bonusAmount", Number(e.target.value))
                }
              />
              <span>giờ thưởng</span>
            </div>

            {/* LIST NHÁNH */}
            <LimitTree
              limitTree={limitTree}
              openGroups={openGroups}
              selectedLimits={selectedLimits}
              toggleGroup={toggleGroup}
              toggleLimit={toggleLimit}
            />

            {/* MÃ KHÔNG ĐƯỢC THƯỞNG */}
            <NoBonusCodes
              merged={merged}
              handleChange={handleChange}
              newCode={newCode}
              setNewCode={setNewCode}
            />

            <div className="flex justify-end pt-3">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded"
              >
                <Save size={16} /> Lưu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
