// components/ManageMembers/overtimeConfig/SectionBonusConfig.js
// Cấu hình thưởng tăng ca theo nhánh giới hạn

import React, { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { ChevronDown, ChevronRight, Save } from "lucide-react";
import { LEAVE_CODES } from "../../../hooks/useOvertimeParser/parseHelpers";

export default function SectionBonusConfig({ config, setConfig }) {
  const [limitTree, setLimitTree] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [selectedLimits, setSelectedLimits] = useState([]); // danh sách giới hạn được chọn
  const [newCode, setNewCode] = useState("");

  // ========================
  // LẤY DỮ LIỆU TỪ overtimeLimits/ (realtime)
  // ========================
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

  // ========================
  // ĐỌC TRẠNG THÁI CHECK ĐÃ LƯU (realtime)
  // ========================
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "bonusConfig", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSelectedLimits(data.selectedLimits || []);
        setConfig(data); // đồng bộ luôn với cấu hình thưởng
      }
    });

    return () => unsub();
  }, []);

  const handleChange = (key, value) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const defaultConfig = {
    bonusEnabled: false,
    bonusEvery: 2,
    bonusAmount: 0.5,
    customNoBonus: [],
  };
  const merged = { ...defaultConfig, ...config };

  // ========================
  // MỞ / ĐÓNG TREE
  // ========================
  const toggleGroup = (key) => setOpenGroups((p) => ({ ...p, [key]: !p[key] }));

  // ========================
  // CHỌN GIỚI HẠN
  // ========================
  const toggleLimit = async (limitKey) => {
    const newList = selectedLimits.includes(limitKey)
      ? selectedLimits.filter((k) => k !== limitKey)
      : [...selectedLimits, limitKey];

    setSelectedLimits(newList);

    // đồng bộ realtime ngay trong Firestore
    try {
      await setDoc(
        doc(db, "bonusConfig", "main"),
        { ...merged, selectedLimits: newList },
        { merge: true }
      );
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật bonusConfig:", err);
    }
  };

  // ========================
  // THÊM MÃ KHÔNG ĐƯỢC THƯỞNG
  // ========================
  const addNoBonusCode = () => {
    const code = newCode.trim();
    if (!code) return;
    if (LEAVE_CODES.includes(code) || merged.customNoBonus.includes(code)) {
      alert("Mã đã tồn tại trong danh sách không được thưởng.");
      return;
    }
    handleChange("customNoBonus", [...merged.customNoBonus, code]);
    setNewCode("");
  };

  const removeCode = (code) =>
    handleChange(
      "customNoBonus",
      merged.customNoBonus.filter((c) => c !== code)
    );

  // ========================
  // LƯU CẤU HÌNH + CẬP NHẬT NHÂN VIÊN
  // ========================
  const handleSave = async () => {
    try {
      // 1️⃣ Lưu cấu hình chung
      await setDoc(doc(db, "bonusConfig", "main"), {
        ...merged,
        selectedLimits,
      });

      if (!merged.bonusEnabled) {
        alert("✅ Đã lưu (thưởng đang tắt)");
        return;
      }

      // 2️⃣ Cập nhật nhân viên trong từng giới hạn đã chọn
      for (const limitKey of selectedLimits) {
        const limitDoc = await getDocs(collection(db, "overtimeLimits"));
        for (const docSnap of limitDoc.docs) {
          const data = docSnap.data();
          if (`${data.limit}h` === limitKey) {
            const members = (data.members || []).map((m) => ({
              ...m,
              thuongTangCa: {
                sauBaoNhieuTieng: merged.bonusEvery,
                congThem: merged.bonusAmount,
              },
            }));

            // ghi đè lại field members trong document tương ứng
            await setDoc(
              doc(db, "overtimeLimits", docSnap.id),
              { ...data, members },
              { merge: true }
            );
          }
        }
      }

      alert("✅ Đã lưu cấu hình thưởng và cập nhật nhân viên thành công!");
    } catch (err) {
      console.error("❌ Lỗi khi lưu cấu hình thưởng:", err);
      alert("❌ Lưu thất bại, xem console.");
    }
  };

  // ========================
  // GIAO DIỆN
  // ========================
  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-950/20 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
        💰 Thưởng tăng ca
      </h3>

      {/* Checkbox bật thưởng */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={merged.bonusEnabled}
          onChange={(e) => handleChange("bonusEnabled", e.target.checked)}
          className="w-4 h-4 text-indigo-600"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Áp dụng thưởng tăng ca
        </span>
      </label>

      {merged.bonusEnabled && (
        <>
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

          {/* Tree giới hạn */}
          <div className="border-t border-gray-300 dark:border-gray-700 pt-3">
            <p className="font-medium text-gray-800 dark:text-gray-100 mb-1">
              🌿 Chọn nhánh giới hạn áp dụng thưởng:
            </p>

            <div className="space-y-2 text-sm">
              {Object.keys(limitTree).length === 0 && (
                <div className="text-gray-500 text-xs">
                  Đang tải cây giới hạn...
                </div>
              )}
              {Object.entries(limitTree).map(([limitKey, members]) => {
                const isOpen = openGroups[limitKey] ?? false;
                const isChecked = selectedLimits.includes(limitKey);

                return (
                  <div
                    key={limitKey}
                    className="border border-gray-400/40 rounded-md bg-white/30 dark:bg-gray-800/40"
                  >
                    <button
                      onClick={() => toggleGroup(limitKey)}
                      className="flex justify-between items-center w-full px-2 py-1"
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-indigo-400" />
                        )}
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleLimit(limitKey)}
                            className="w-3 h-3 text-indigo-500"
                          />
                          <span className="font-medium text-indigo-500">
                            Giới hạn {limitKey}
                          </span>
                        </label>
                      </div>
                      <span className="text-xs text-gray-400">
                        {members.length} nhân viên
                      </span>
                    </button>

                    {isOpen && (
                      <ul className="pl-6 pb-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        {members.map((m) => (
                          <li key={m.id} className="truncate">
                            • {m.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mã không được thưởng */}
          <div className="border-t border-gray-300 dark:border-gray-700 pt-3">
            <p className="font-medium text-gray-800 dark:text-gray-100 mb-1">
              ⚠️ Các trường hợp không được thưởng:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs">
              {[...LEAVE_CODES, ...merged.customNoBonus].map((code, i) => (
                <div key={i} className="flex justify-between pr-2">
                  <span>
                    {i + 1}. {code}
                  </span>
                  {merged.customNoBonus.includes(code) && (
                    <button
                      onClick={() => removeCode(code)}
                      className="text-red-500 hover:underline text-[11px]"
                    >
                      xoá
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Thêm mã mới..."
                className="flex-1 text-xs px-2 py-1 border rounded dark:bg-gray-800 dark:text-gray-100"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNoBonusCode()}
              />
              <button
                onClick={addNoBonusCode}
                className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
              >
                Thêm
              </button>
            </div>
          </div>

          {/* Nút lưu */}
          <div className="flex justify-end pt-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              <Save size={16} /> Lưu cấu hình thưởng
            </button>
          </div>
        </>
      )}
    </div>
  );
}
